export type TargetType = 'dom_selector' | 'canvas_node';

export interface TourTarget {
  type: TargetType;
  value: string;
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targets: TourTarget[];
}

export interface SpotlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpotlightRects {
  /** Single combined bounding box enclosing all targets */
  combined: SpotlightBox;
  /** Individual rects for each resolved target (for multi-hole masks) */
  individual: SpotlightBox[];
}
