import { Product } from '@/types';

// Mock product data
export const products: Product[] = [
  {
    id: '1',
    name: 'Notebook Gamer Pro',
    description: 'Notebook de alta performance com RTX 4060, 16GB RAM e SSD 512GB. Ideal para jogos e trabalho pesado.',
    price: 5499.99,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&h=500&fit=crop',
    category: 'Eletrônicos',
    stock: 15,
    stripePriceId: 'price_1STp0PJeEakYE1R5UJ4C0f8c',
  },
  {
    id: '2',
    name: 'Mouse Gamer RGB',
    description: 'Mouse gamer com sensor óptico de alta precisão, 7 botões programáveis e iluminação RGB customizável.',
    price: 249.99,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',
    category: 'Periféricos',
    stock: 50,
    stripePriceId: 'price_1STp0PJeEakYE1R5L8dwQyuE',
  },
  {
    id: '3',
    name: 'Teclado Mecânico RGB',
    description: 'Teclado mecânico com switches blue, iluminação RGB por tecla e construção em alumínio.',
    price: 449.99,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500&h=500&fit=crop',
    category: 'Periféricos',
    stock: 30,
    stripePriceId: 'price_1STp0QJeEakYE1R57Bi4UAoZ',
  },
  {
    id: '4',
    name: 'Monitor 27" 144Hz',
    description: 'Monitor gamer 27 polegadas, resolução Full HD, taxa de atualização de 144Hz e tempo de resposta 1ms.',
    price: 1299.99,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&h=500&fit=crop',
    category: 'Eletrônicos',
    stock: 20,
    stripePriceId: 'price_1STp0QJeEakYE1R5hUNQLcR5',
  },
  {
    id: '5',
    name: 'Headset Gamer 7.1',
    description: 'Headset gamer com som surround 7.1, microfone removível e almofadas confortáveis.',
    price: 349.99,
    image: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=500&h=500&fit=crop',
    category: 'Periféricos',
    stock: 40,
    stripePriceId: 'price_1STp0RJeEakYE1R5hdeBSgTT',
  },
  {
    id: '6',
    name: 'Webcam Full HD',
    description: 'Webcam 1080p com foco automático, microfone integrado e iluminação ajustável.',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1588426850757-54f0abf44a0d?w=500&h=500&fit=crop',
    category: 'Periféricos',
    stock: 25,
    stripePriceId: 'price_1STp0RJeEakYE1R5shA89lvz',
  },
  {
    id: '7',
    name: 'Cadeira Gamer Ergonômica',
    description: 'Cadeira gamer com ajuste de altura, reclinável até 180°, apoio lombar e de braços 4D.',
    price: 1099.99,
    image: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=500&h=500&fit=crop',
    category: 'Móveis',
    stock: 12,
    stripePriceId: 'price_1STp0SJeEakYE1R5ILVJcwvH',
  },
  {
    id: '8',
    name: 'SSD NVMe 1TB',
    description: 'SSD NVMe M.2 1TB com velocidades de leitura de até 3500MB/s e gravação de 3000MB/s.',
    price: 499.99,
    image: 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=500&h=500&fit=crop',
    category: 'Hardware',
    stock: 35,
    stripePriceId: 'price_1STp0TJeEakYE1R5q9YHlj89',
  },
];

// Repository implementation following Interface Segregation Principle
export class ProductRepository {
  async getAll(): Promise<Product[]> {
    return Promise.resolve(products);
  }

  async getById(id: string): Promise<Product | null> {
    const product = products.find((p) => p.id === id);
    return Promise.resolve(product || null);
  }

  async getByCategory(category: string): Promise<Product[]> {
    const filtered = products.filter((p) => p.category === category);
    return Promise.resolve(filtered);
  }
}
