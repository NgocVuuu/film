import React from 'react';

interface StaticPageProps {
    title: string;
    content: React.ReactNode;
}

export default function StaticPage({ title, content }: StaticPageProps) {
    return (
        <div className="container mx-auto px-4 py-24 max-w-4xl text-gray-300">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 border-b border-white/10 pb-4">
                {title}
            </h1>
            <div className="prose prose-invert prose-lg max-w-none">
                {content}
            </div>
        </div>
    );
}
