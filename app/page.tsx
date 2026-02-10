import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const InfiniteHero = dynamic(() => import('@/components/ui/infinite-hero'), {
    ssr: false,
    loading: () => <div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>
});

export default function Home() {
    return (
        <Suspense fallback={null}>
            <InfiniteHero />
        </Suspense>
    );
}
