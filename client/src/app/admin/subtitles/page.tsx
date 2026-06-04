import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dịch Phụ Đề | PCHILL Admin',
    description: 'Công cụ dịch phụ đề bằng AI',
};

export default function SubtitleTranslatorPage() {
    return (
        <div className="w-full h-[calc(100vh-80px)] -m-4 md:-m-6 relative">
            <iframe 
                src="http://localhost:3001" 
                className="w-full h-full border-0 absolute top-0 left-0"
                title="Subtitle Translator"
                allow="clipboard-write; clipboard-read"
            />
        </div>
    );
}
