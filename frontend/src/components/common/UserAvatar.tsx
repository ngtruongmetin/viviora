type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: 'small' | 'medium' | 'large';
};

export function UserAvatar({ name, avatarUrl, size = 'medium' }: UserAvatarProps) {
  const className = `user-avatar user-avatar-${size}`;
  return avatarUrl ? (
    <span className={className}>
      <img src={avatarUrl} alt={`Ảnh đại diện của ${name}`} />
    </span>
  ) : (
    <div className={className} aria-label={`Ảnh đại diện của ${name}`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
