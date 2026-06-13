'use client';

import React, { useState, useEffect } from 'react';
import { uploadMenuImageAction, getAvailableMenuImages } from '@/app/admin/menu/actions';
import GoldSpinner from '@/components/ui/gold-spinner';
import { Button } from '@/components/ui/button';

type ImageUploaderProps = {
  value: string | null | undefined;
  onChange: (path: string | null) => void;
};

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [gallery, setGallery] = useState<{ id: string; file_path: string }[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'upload' | 'gallery'>('upload');

  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const images = await getAvailableMenuImages();
      setGallery(images || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    if (tab === 'gallery') {
      loadGallery();
    }
  }, [tab]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadMenuImageAction(formData);
      if (res.success && res.filePath) {
        onChange(res.filePath);
        // Refresh gallery
        if (tab === 'gallery') {
          loadGallery();
        } else {
          setTab('gallery');
        }
      } else {
        setError(res.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex border-b border-primary/20">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-bold transition-colors ${
            tab === 'upload' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Prześlij / Upload
        </button>
        <button
          type="button"
          onClick={() => setTab('gallery')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-bold transition-colors ${
            tab === 'gallery' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Galeria / Gallery
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded text-center">
          {error}
        </p>
      )}

      {tab === 'upload' && (
        <div className="border border-dashed border-primary/30 rounded-lg p-8 text-center bg-[#070B1E]/40 hover:border-primary/60 transition-colors relative">
          {uploading ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <GoldSpinner size="md" />
              <span className="text-xs text-muted-foreground">Przesyłanie zdjęcia... / Uploading...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg className="w-10 h-10 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-foreground">Wybierz zdjęcie potrawy / Choose dish photo</p>
                <p className="text-muted-foreground/60">Maks. 5MB (PNG, JPEG, WEBP)</p>
              </div>
              <div className="flex justify-center">
                <label className="cursor-pointer bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 py-2 rounded text-xs font-bold text-primary transition-colors tracking-wide uppercase">
                  Wybierz plik / Browse File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'gallery' && (
        <div className="space-y-4">
          {loadingGallery ? (
            <div className="flex items-center justify-center p-8">
              <GoldSpinner size="sm" />
            </div>
          ) : gallery.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-8">
              Brak zdjęć w galerii. / Gallery is empty.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[220px] overflow-y-auto p-1 scrollbar-thin">
              {gallery.map((img) => {
                const isSelected = value === img.file_path;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => onChange(img.file_path)}
                    className={`aspect-square relative rounded overflow-hidden border bg-[#050B1E] flex flex-col justify-end p-1 transition-all ${
                      isSelected ? 'border-primary ring-2 ring-primary/45' : 'border-primary/10 hover:border-primary/40'
                    }`}
                  >
                    {/* Display filename */}
                    <div className="absolute inset-0 flex items-center justify-center bg-[#070B1E]/60 text-[9px] text-muted-foreground truncate p-1 text-center font-mono">
                      {img.file_path.split('/').pop()}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-black rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold z-10">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-2 truncate">
            <span className="text-xs text-primary font-bold">✓</span>
            <span className="text-xs text-muted-foreground font-mono truncate" title={value}>
              {value}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
          >
            Usuń / Remove
          </button>
        </div>
      )}
    </div>
  );
}
