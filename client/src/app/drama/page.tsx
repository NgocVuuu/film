import { Metadata } from 'next';
import DramaClient from './DramaClient';

export const metadata: Metadata = {
    title: 'Góc Chê Phim & Bánh Cuốn - Pchill',
    description: 'Nơi cộng đồng review, ném đá rác phẩm và tôn vinh những bộ phim bánh cuốn nhất.',
};

export default function DramaPage() {
    return <DramaClient />;
}
