import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ContactInfo, SocialLink, FooterSettings, NavLink, FooterColumn } from '../types';
import { 
    FacebookIcon, InstagramIcon, TwitterIcon, YoutubeIcon, PinterestIcon, LinkedinIcon,
    PhoneIcon, MailIcon, MapPinIcon
} from './Icons';
import LazyImage from './LazyImage';

interface SiteSettings {
    logoUrl: string;
    siteTitle: string;
    footer?: Partial<FooterSettings>;
}


const SocialIconComponent: React.FC<{ platform: SocialLink['platform'], className?: string }> = ({ platform, className }) => {
    switch (platform) {
        case 'facebook': return <FacebookIcon className={className} />;
        case 'instagram': return <InstagramIcon className={className} />;
        case 'twitter': return <TwitterIcon className={className} />;
        case 'youtube': return <YoutubeIcon className={className} />;
        case 'pinterest': return <PinterestIcon className={className} />;
        case 'linkedin': return <LinkedinIcon className={className} />;
        default: return null;
    }
};


const Footer: React.FC = () => {
  const { navigate } = useNavigation();
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [settings, setSettings] = useState<Partial<SiteSettings>>({
    logoUrl: 'https://i.ibb.co/7j0b561/logo.png',
    siteTitle: 'AURASHKA',
    footer: {
      description: "Unleash your divine beauty with nature's finest ingredients.",
      copyrightText: "",
      columns: {},
      newsletter: { title: 'Newsletter', subtitle: 'Subscribe for updates and special offers.' },
      contactInfo: {},
      socialLinks: {},
      socialIconSize: 24,
    }
  });

  useEffect(() => {
    const settingsRef = db.ref('site_settings');
    const listener = settingsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setSettings(prev => ({
                ...prev,
                ...data,
                footer: {
                    ...prev.footer,
                    ...(data.footer || {})
                }
            }));
        }
    });
    return () => settingsRef.off('value', listener);
  }, []);

  const handleLinkClick = (e: React.MouseEvent, link: NavLink) => {
    e.preventDefault();
    switch (link.linkType) {
        case 'internal':
            navigate(link.link as any);
            break;
        case 'external':
            window.open(link.link, '_blank', 'noopener,noreferrer');
            break;
        case 'product':
            navigate('product', { productId: link.link });
            break;
        case 'category':
            navigate('shop', { categoryId: link.link, categoryName: link.text });
            break;
        default:
            break;
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberEmail) return;

    const config = settings.footer?.newsletter;
    if (!config?.recipientEmail) {
        alert("Thank you for subscribing!");
        setSubscriberEmail('');
        return;
    }

    let userDetails = 'User is not logged in.';
    if (currentUser) {
        const userRef = db.ref(`users/${currentUser.uid}`);
        try {
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            if (userData) {
                userDetails = `Name: ${userData.name}\nEmail: ${userData.email}\nPhone: ${userData.phone}`;
            } else {
                 userDetails = `Logged in user: ${currentUser.email}`;
            }
        } catch (error) {
             userDetails = `Logged in user: ${currentUser.email} (Could not fetch full details).`;
        }
    }

    const bodyTemplate = config.emailBodyTemplate || 'New subscriber: {{email}}\n\n--- User Info ---\n{{userDetails}}';
    let body = bodyTemplate
        .replace('{{email}}', subscriberEmail)
        .replace('{{userDetails}}', userDetails);

    const subject = config.emailSubject || 'New Newsletter Subscriber';
    
    const mailtoLink = `mailto:${config.recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;
    setSubscriberEmail('');
  };

  const footerColumns: FooterColumn[] = settings.footer?.columns ? Object.values(settings.footer.columns) : [];
  const socialLinks: SocialLink[] = settings.footer?.socialLinks ? Object.values(settings.footer.socialLinks) : [];
  const hasContactInfo = settings.footer?.contactInfo && Object.values(settings.footer.contactInfo).some(val => val);

  const getVisibleLinks = (links: { [key: string]: NavLink } | undefined) => {
      if (!links) return [];
      return Object.values(links).filter(link => {
          if (!link.displayThemes || Object.keys(link.displayThemes).length === 0) {
              return true;
          }
          return link.displayThemes[theme];
      });
  };

  return (
    <footer className="bg-brand-text text-brand-bg">
      <div className="max-w-screen-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-1">
             <a href="#" onClick={(e) => { e.preventDefault(); navigate('home'); }} className="flex items-center space-x-2">
                <LazyImage wrapperClassName="h-10 w-10 bg-brand-surface rounded-full p-1" src={settings.logoUrl} alt={`${settings.siteTitle} Logo`} className="h-full w-full object-contain" />
                <span className="text-2xl font-serif tracking-widest uppercase">{settings.siteTitle}</span>
            </a>
            <p className="mt-4 text-sm text-brand-bg/70">
              {settings.footer?.description}
            </p>
            {socialLinks.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm font-semibold tracking-wider uppercase">Follow Us</h3>
                    <div className="mt-4 flex space-x-4">
                        {socialLinks.map(link => (
                            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-brand-bg/70 hover:text-brand-bg">
                                <span className="sr-only">{link.platform}</span>
                                <SocialIconComponent platform={link.platform} className="h-6 w-6" style={{ height: `${settings.footer?.socialIconSize}px`, width: `${settings.footer?.socialIconSize}px` }} />
                            </a>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {hasContactInfo && (
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase">Contact Us</h3>
                <ul className="mt-4 space-y-3">
                    {settings.footer?.contactInfo?.phone && (
                        <li className="flex items-start"><PhoneIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /><span className="text-sm text-brand-bg/70">{settings.footer.contactInfo.phone}</span></li>
                    )}
                    {settings.footer?.contactInfo?.email && (
                        <li className="flex items-start"><MailIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /><a href={`mailto:${settings.footer.contactInfo.email}`} className="text-sm text-brand-bg/70 hover:text-brand-bg">{settings.footer.contactInfo.email}</a></li>
                    )}
                    {settings.footer?.contactInfo?.location && (
                         <li className="flex items-start"><MapPinIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /><span className="text-sm text-brand-bg/70">{settings.footer.contactInfo.location}</span></li>
                    )}
                </ul>
              </div>
          )}

          {footerColumns.map(col => (
             <div key={col.id}>
                <h3 className="text-sm font-semibold tracking-wider uppercase">{col.title}</h3>
                <ul className="mt-4 space-y-2">
                    {getVisibleLinks(col.links).map(link => (
                         <li key={link.id}>
                            <a href={link.link} onClick={(e) => handleLinkClick(e, link)} className="text-sm text-brand-bg/70 hover:text-brand-bg">
                                {link.text}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
          ))}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-sm font-semibold tracking-wider uppercase">{settings.footer?.newsletter?.title}</h3>
            <p className="mt-4 text-sm text-brand-bg/70">{settings.footer?.newsletter?.subtitle}</p>
            <form className="mt-4 flex" onSubmit={handleNewsletterSubmit}>
              <input type="email" placeholder="Your email" value={subscriberEmail} onChange={e => setSubscriberEmail(e.target.value)} required className="w-full px-4 py-2 bg-brand-surface border border-r-0 border-brand-light-gray text-brand-text rounded-l-md focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green" />
              <button type="submit" className="px-4 py-2 bg-brand-green rounded-r-md hover:bg-opacity-90 text-white">Go</button>
            </form>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-brand-bg/20 text-center text-sm text-brand-bg/50">
          <p>{settings.footer?.copyrightText || `© ${new Date().getFullYear()} ${settings.siteTitle}. All rights reserved.`}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;