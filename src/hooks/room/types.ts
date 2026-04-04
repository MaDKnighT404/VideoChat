export interface RoomSessionRouter {
  replace: (href: string) => void;
  push: (href: string) => void;
}
