export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="placeholder">
      <span className="eyebrow">SẮP RA MẮT</span>
      <h1>{title}</h1>
      <p>
        Mô-đun này đã được chuẩn bị trong kiến trúc Viviora và sẽ được phát triển ở giai đoạn tiếp
        theo.
      </p>
    </div>
  );
}
