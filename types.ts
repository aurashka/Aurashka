import { type } from "os";

export type Theme = 'light' | 'dark' | 'blue' | 'diwali' | 'diwali-dark';

export interface DiwaliOverlaySetting {
    url?: string;
    darkUrl?: string;
    enabled?: boolean;
    opacity?: number; // 0 to 1
}

export interface DiwaliThemeSettings {
    headerOverlay?: DiwaliOverlaySetting;
    cornerRangoli?: DiwaliOverlaySetting;
    fireworks?: DiwaliOverlaySetting;
    diyaRow?: DiwaliOverlaySetting;
    footerDecorativeOverlay?: DiwaliOverlaySetting;
    headerGarland?: DiwaliOverlaySetting;
}

export interface FloatingDecoration {
    id: string;
    name: string; // for admin panel identification
    imageUrl: string;
    darkImageUrl?: string;
    enabled: boolean;
    opacity: number;
    top: string;
    left?: string;
    right?: string;
    width: string;
    height?: string;
    rotation: number;
    zIndex: number;
    displayOnThemes: { [key in Theme]?: boolean };
}

export interface ColorSet {
    primary: string; // e.g. "107 127 115"
    bg: string;
    surface: string;
    text: string;
    secondary: string;
    lightGray: string;
    shadowRgb: string; // e.g. "0 0 0"
    buttonTextureUrl?: string;
    buttonTextColor?: string;
    surfaceTextureUrl?: string;
    surfaceTextureOpacity?: number; // 0 to 1
}

export interface ThemeColors {
    light: Partial<ColorSet>;
    dark: Partial<ColorSet>;
    blue: Partial<ColorSet>;
    diwali: Partial<ColorSet>;
    'diwali-dark': Partial<ColorSet>;
}


export interface Tag {
  id: string;
  text: string;
  color: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "50ml" or "Red"
  price: number;
  oldPrice?: number;
  stock: number;
}

export interface Product {
  id: number | string;
  name: string;
  price: number;
  oldPrice?: number;
  images: string[];
  description: string;
  category: string;
  subcategory?: string;
  isPopular?: boolean;
  
  // New fields
  stock: number;
  tags?: { [key: string]: Omit<Tag, 'id'> }; // Firebase-friendly object
  variants?: { [key:string]: Omit<ProductVariant, 'id'> }; // Firebase-friendly object
  isVisible?: boolean; // New visibility flag
  hasCustomOverlay?: boolean;
}

export interface QnA {
  id: string;
  question: string;
  answer: string;
}

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id:string;
  name: string;
  image: string;
  subcategories?: SubCategory[];
}

export interface User {
    id: string; // This will be the UID from firebase
    name: string;
    email: string;
    phone: string;
    role?: 'admin' | 'user';
}

export interface CartItem extends Product {
  quantity: number;
  // This will store the selected variant details, if any.
  // The cart logic will create a unique ID based on product.id + selectedVariant.id
  selectedVariant?: ProductVariant; 
}


export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: CartItem[];
  total: number;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
}

export interface HeroImageStyles {
  zoom: number; // Percentage, e.g., 100, 120
  focusPoint: string; // CSS object-position value, e.g., 'center', 'top right'
}

export interface HeroSettings {
  image: string;
  preheadline: string;
  headline: string;
  subheadline: string;
  overlayColor: string;
  buttonText: string;
  buttonLinkType: 'none' | 'internal' | 'external' | 'product' | 'category';
  buttonLink: string; // URL, page name, product ID, or categoryID:categoryName
  fontSizes: {
    preheadline: number;
    headline: number;
    subheadline: number;
  };
  imageStyles?: {
    desktop: HeroImageStyles;
    mobile: HeroImageStyles;
  };
}


export interface SocialLink {
    id: string;
    platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'pinterest' | 'linkedin';
    url: string;
}

export interface ContactInfo {
    phone?: string;
    email?: string;
    location?: string;
    timing?: string;
}

export interface PosterSlide {
  id: string;
  image: string;
  altText?: string;
  linkType: 'none' | 'internal' | 'external' | 'product' | 'category';
  link: string;
}

export interface ImageScrollerSettings {
  enabled: boolean;
  slides: { [key: string]: PosterSlide };
  slideSize?: 'small' | 'medium' | 'large';
}

export interface OfferSectionSettings {
  id: string;
  enabled: boolean;
  title: string;
  titleImageUrl?: string;
  productIds: { [key: string]: boolean };
  order: number;
  layout: 'grid' | 'list' | 'horizontal-scroll' | 'single';
  gridCols: number;
  itemsToShow?: number; // For horizontal scroll
  contentAlignment: 'start' | 'center' | 'end';
  location: 'top' | 'default' | 'bottom'; // New location property
  decorationImageUrl?: string;
}

export interface BestsellerListSettings {
  id: string;
  enabled: boolean;
  title: string;
  productIds: { [key: string]: boolean };
  order: number;
  layout: 'grid' | 'horizontal-scroll';
  gridCols?: number;
  rows?: number;
  itemsToShow?: number;
  location: 'top' | 'default' | 'bottom';
}

export interface CategoryCardSettings {
  height: string; // e.g., '384px'
  borderRadiusTop: string; // e.g., '150px'
  borderRadiusBottom: string; // e.g., '12px'
  decorationIcon: 'sparkle' | 'star' | 'leaf' | 'custom' | 'none';
  customDecorationIconUrl?: string;
  decorationIconSize: number; // in pixels
  decorationIconColor: string; // hex code
  frameImageUrl?: string;
}

// For homepage highlighted note card
export interface HighlightedNoteSettings {
  enabled: boolean;
  title: string;
  text: string;
  backgroundColor: string;
  textColor: string;
}

export interface NavLink {
    id: string;
    text: string;
    linkType: 'internal' | 'external' | 'product' | 'category';
    link: string;
    displayThemes?: { [key in Theme]?: boolean };
    icon?: 'phone' | 'mail' | 'cart' | 'arrowRight' | 'none';
}

export interface FooterColumn {
    id: string;
    title: string;
    links: { [key: string]: NavLink };
}

export interface FooterSettings {
    description: string;
    copyrightText: string;
    columns: { [key: string]: FooterColumn };
    newsletter: {
        title: string;
        subtitle: string;
        recipientEmail?: string;
        emailSubject?: string;
        emailBodyTemplate?: string;
    };
    socialLinks?: { [key: string]: SocialLink };
    contactInfo?: ContactInfo;
    socialIconSize?: number;
}

export interface ActionButtonSettings {
  text: string;
  linkType: 'default' | 'internal' | 'external' | 'product' | 'category' | 'phone' | 'email';
  link: string;
  icon?: 'none' | 'cart' | 'arrowRight' | 'phone' | 'mail';
  style: 'primary' | 'secondary';
  enabled: boolean;
}

export interface ProductPageSettings {
    shippingReturnsInfo: string;
    buttons: {
        addToCart: Partial<ActionButtonSettings>;
        buyNow: Partial<ActionButtonSettings>;
    };
}

export interface Author {
  id: string;
  name: string;
  image: string;
  quote: string;
}

export interface TestimonialsSettings {
  enabled: boolean;
  title: string;
  authors: { [key: string]: Omit<Author, 'id'> };
}

export interface DecorativeOverlay {
    url?: string;
    opacity?: number; // 0 to 1
}

export interface HeaderOverlapImageSettings {
    enabled: boolean;
    imageUrl: string;
    opacity: number; // 0 to 1
    position: 'full' | 'left' | 'right' | 'center';
    width: string; // e.g. "300px", "100%"
    height: string; // e.g. "150px"
    top: string; // e.g. "0px", "20px"
    zIndex: number;
}

export interface ShopPageSettings {
    title: string;
    subtitle: string;
}

export interface BottomBlendSettings {
    enabled: boolean;
    imageUrl: string;
    darkImageUrl?: string;
    opacity: number; // 0 to 1
    height: string; // e.g., '300px', '40vh'
    displayOnThemes: { [key in Theme]?: boolean };
}