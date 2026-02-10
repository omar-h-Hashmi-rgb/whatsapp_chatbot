import dynamic from 'next/dynamic';

const InfiniteHero = dynamic(() => import('@/components/ui/infinite-hero'), { ssr: false });

export default function Home() {
    return <InfiniteHero />;
}
