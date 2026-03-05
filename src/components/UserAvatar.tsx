"use client";

interface UserAvatarProps {
  name: string;
  avatar?: string | null;
  role?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const roleColors: Record<string, string> = {
  PROVIDER: "bg-teal-500",
  PATIENT: "bg-blue-500",
  ADMIN: "bg-purple-500",
};

export default function UserAvatar({
  name,
  avatar,
  role = "PATIENT",
  size = "md",
}: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} ${
        roleColors[role] || "bg-gray-500"
      } rounded-full flex items-center justify-center text-white font-medium`}
    >
      {initials}
    </div>
  );
}
