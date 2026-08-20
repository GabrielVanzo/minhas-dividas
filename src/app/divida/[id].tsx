import { useLocalSearchParams } from 'expo-router';

import { DividaForm } from '@/components/DividaForm';

export default function EditarDividaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DividaForm dividaId={id} />;
}
