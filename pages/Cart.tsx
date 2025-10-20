import React from 'react';
import { useCart } from '../contexts/CartContext';
import { useNavigation } from '../contexts/NavigationContext';
import { TrashIcon } from '../components/Icons';
import LazyImage from '../components/LazyImage';

const Cart: React.FC = () => {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const { navigate } = useNavigation();

  if (cartCount === 0) {
    return (
      <section className="py-32 bg-brand-bg min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-brand-text">Your Cart is Empty</h1>
          <p className="mt-4 text-brand-secondary">Looks like you haven't added anything to your cart yet.</p>
          <button
            onClick={() => navigate('shop')}
            className="mt-8 bg-brand-green text-white px-8 py-3 rounded-full text-base font-medium hover:bg-opacity-90 transition-colors shadow-lg"
          >
            Continue Shopping
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-32 bg-brand-bg">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-serif font-bold text-center text-brand-text mb-12">Shopping Cart</h1>
        <div className="bg-brand-surface shadow-lg rounded-lg p-6">
          <div className="divide-y divide-brand-light-gray">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center justify-between py-6">
                <div className="flex items-center space-x-4">
                  <LazyImage wrapperClassName="w-24 h-24 rounded-md" src={item.images[0]} alt={item.name} className="w-full h-full object-cover rounded-md" />
                  <div>
                    <h3 className="text-lg font-semibold text-brand-text">{item.name}</h3>
                    <p className="text-brand-secondary">₹{item.price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center border border-brand-light-gray rounded-md">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-brand-secondary hover:bg-brand-light-gray/50">-</button>
                    <span className="px-4 py-1">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-brand-secondary hover:bg-brand-light-gray/50">+</button>
                  </div>
                  <p className="font-bold text-lg text-brand-text">₹{(item.price * item.quantity).toFixed(2)}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-brand-secondary/50 hover:text-red-500">
                    <TrashIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-brand-light-gray flex justify-end">
            <div className="w-full max-w-sm">
                <div className="flex justify-between text-lg font-medium text-brand-secondary">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-brand-text mt-2">
                    <span>Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <button className="w-full mt-6 bg-brand-green text-white px-8 py-3 rounded-full text-base font-medium hover:bg-opacity-90 transition-colors shadow-lg">
                    Proceed to Checkout
                </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Cart;