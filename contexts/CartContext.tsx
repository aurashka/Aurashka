import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem, Product, ProductVariant } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedVariant?: ProductVariant) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Helper to generate a unique ID for a cart item based on product and variant
const getCartItemId = (product: Product, variant?: ProductVariant) => {
    return variant ? `${product.id}-${variant.id}` : String(product.id);
};

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const localData = localStorage.getItem('aurashka_cart');
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('aurashka_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product, quantityToAdd = 1, selectedVariant?: ProductVariant) => {
    setCartItems(prevItems => {
      const cartItemId = getCartItemId(product, selectedVariant);
      const existingItem = prevItems.find(item => getCartItemId(item, item.selectedVariant) === cartItemId);
      
      if (existingItem) {
        return prevItems.map(item =>
          getCartItemId(item, item.selectedVariant) === cartItemId 
          ? { ...item, quantity: item.quantity + quantityToAdd } 
          : item
        );
      }
      
      const newItem: CartItem = { 
          ...product, 
          quantity: quantityToAdd,
          selectedVariant: selectedVariant,
          // Override price if variant is selected
          price: selectedVariant ? selectedVariant.price : product.price 
      };

      return [...prevItems, newItem];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => getCartItemId(item, item.selectedVariant) !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item => (getCartItemId(item, item.selectedVariant) === cartItemId ? { ...item, quantity } : item))
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
        const price = item.selectedVariant ? item.selectedVariant.price : item.price;
        return total + price * item.quantity;
    }, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};