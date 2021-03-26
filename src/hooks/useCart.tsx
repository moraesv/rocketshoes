import { createContext, ReactNode, useContext } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';
import { useLocalStorage } from './useLocalStorage';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useLocalStorage<Product[]>('@RocketShoes:cart', []);

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get<Stock>(`/stock/${productId}`);

      const item = cart.find((item) => item.id === productId);
      if (item) {
        if (responseStock.data.amount <= item.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        setCart((prev) =>
          prev.map((item) =>
            item.id === productId ? { ...item, amount: item.amount + 1 } : item
          )
        );
      } else {
        if (responseStock.data.amount <= 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const responseProduct = await api.get<Product>(
          `/products/${productId}`
        );

        if (!responseProduct.data.id) {
          toast.error('Erro na adição do produto');
          return;
        }

        setCart((prev) => [...prev, { ...responseProduct.data, amount: 1 }]);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some((product) => product.id === productId)) {
        toast.error('Erro na remoção do produto');
        return;
      }

      setCart((prev) => prev.filter((item) => item.id !== productId));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const responseStock = await api.get<Stock>(`/stock/${productId}`);

      if (responseStock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, amount } : item))
      );
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
