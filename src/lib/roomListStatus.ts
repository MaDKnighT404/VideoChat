export interface RoomStatusStyle {
  text: string;
  color: string;
  textColor: string;
}

export function getRoomStatusLabel(count: number, maxUsers: number): RoomStatusStyle {
  if (count === 0)
    return { text: "Свободна", color: "bg-emerald-500", textColor: "text-emerald-400" };
  if (count >= maxUsers)
    return { text: "Занято", color: "bg-red-500", textColor: "text-red-400" };
  if (maxUsers <= 2 && count === 1)
    return { text: "Ожидание", color: "bg-amber-500", textColor: "text-amber-400" };
  return { text: "Активна", color: "bg-blue-500", textColor: "text-blue-400" };
}
