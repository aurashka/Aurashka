import { Product, Category } from './types';

export const initialCategories: Category[] = [
  { id: '1', name: 'Skin Care', image: 'https://images.unsplash.com/photo-1556228852-6d42a7465715?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80' },
  { id: '2', name: 'Body Care', image: 'https://images.unsplash.com/photo-1611756403568-b7102c7a7f45?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80' },
  { id: '3', name: 'Hair Care', image: 'https://images.unsplash.com/photo-1599388121497-0a442a4505c1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80' },
];

export const popularProducts: Product[] = [];

export const bestsellerProducts: Product[] = [];

const productMap = new Map<number | string, Product>();
[...popularProducts, ...bestsellerProducts].forEach(p => productMap.set(p.id, p));

export const allProducts: Product[] = Array.from(productMap.values());