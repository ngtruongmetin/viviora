import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function LibraryModal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = previousOverflow; };
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`viviora-modal library-modal ${wide ? 'library-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="library-modal-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Đóng"><X size={18} /></button></div>
        {children}
      </section>
    </div>
  );
}
