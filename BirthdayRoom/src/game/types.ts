export type PuzzleId = 'books' | 'drawer' | 'plant' | 'pillow' | 'record';
export type ObjectId = PuzzleId | 'gift' | 'clock';
export type Phase = 'explore' | 'opening' | 'wish' | 'celebrating' | 'greeting';
export type Dialog = ObjectId | 'help' | 'journal' | 'collection' | 'hint' | 'reset' | null;
export type Vec3 = [number, number, number];
export interface CameraBookmark {
  position: Vec3;
  yaw: number;
  pitch: number;
}
export interface FocusTarget {
  position: Vec3;
  lookAt: Vec3;
  returnTo?: CameraBookmark;
}
