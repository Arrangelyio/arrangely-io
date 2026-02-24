/**
 * canvasGridRegions.ts
 * 
 * Calculates bar region positions on the blank grid canvas for spatial-aware recognition.
 * Each section has a label area + rows of 4 bars each.
 */

export interface BarRegion {
  sectionIndex: number;
  sectionName: string;
  rowIndex: number;
  barIndex: number; // 0-3 within the row
  globalBarIndex: number; // absolute index within the section
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SectionLayout {
  name: string;
  rows: number;
  labelY: number;
  startY: number;
}

export interface GridLayoutConfig {
  canvasWidth: number;
  barsPerRow: number;
  barHeight: number;
  sectionLabelHeight: number;
  sectionGap: number;
  topPadding: number;
  sidePadding: number;
}

const DEFAULT_CONFIG: GridLayoutConfig = {
  canvasWidth: 800,
  barsPerRow: 4,
  barHeight: 70,
  sectionLabelHeight: 32,
  sectionGap: 24,
  topPadding: 16,
  sidePadding: 24,
};

export interface SectionDefinition {
  name: string;
  rows: number;
}

/**
 * Calculate the total canvas height needed for the given sections
 */
export function calculateCanvasHeight(
  sections: SectionDefinition[],
  config: Partial<GridLayoutConfig> = {}
): number {
  const c = { ...DEFAULT_CONFIG, ...config };
  let totalHeight = c.topPadding;
  
  for (const section of sections) {
    totalHeight += c.sectionLabelHeight; // label
    totalHeight += section.rows * c.barHeight; // bar rows
    totalHeight += c.sectionGap; // gap after section
  }
  
  return totalHeight + c.topPadding; // bottom padding
}

/**
 * Calculate all bar regions for spatial recognition
 */
export function calculateBarRegions(
  sections: SectionDefinition[],
  config: Partial<GridLayoutConfig> = {}
): BarRegion[] {
  const c = { ...DEFAULT_CONFIG, ...config };
  const regions: BarRegion[] = [];
  const barWidth = (c.canvasWidth - c.sidePadding * 2) / c.barsPerRow;
  
  let currentY = c.topPadding;
  
  sections.forEach((section, sectionIndex) => {
    currentY += c.sectionLabelHeight;
    
    for (let row = 0; row < section.rows; row++) {
      for (let bar = 0; bar < c.barsPerRow; bar++) {
        regions.push({
          sectionIndex,
          sectionName: section.name,
          rowIndex: row,
          barIndex: bar,
          globalBarIndex: row * c.barsPerRow + bar,
          x: c.sidePadding + bar * barWidth,
          y: currentY,
          width: barWidth,
          height: c.barHeight,
        });
      }
      currentY += c.barHeight;
    }
    
    currentY += c.sectionGap;
  });
  
  return regions;
}

/**
 * Calculate section layouts (for drawing labels and grid lines)
 */
export function calculateSectionLayouts(
  sections: SectionDefinition[],
  config: Partial<GridLayoutConfig> = {}
): SectionLayout[] {
  const c = { ...DEFAULT_CONFIG, ...config };
  const layouts: SectionLayout[] = [];
  
  let currentY = c.topPadding;
  
  for (const section of sections) {
    layouts.push({
      name: section.name,
      rows: section.rows,
      labelY: currentY,
      startY: currentY + c.sectionLabelHeight,
    });
    
    currentY += c.sectionLabelHeight + section.rows * c.barHeight + c.sectionGap;
  }
  
  return layouts;
}

/**
 * Get the grid line drawing coordinates for rendering on canvas
 */
export function getGridLineCoordinates(
  sections: SectionDefinition[],
  config: Partial<GridLayoutConfig> = {}
): { horizontal: { y: number; x1: number; x2: number }[]; vertical: { x: number; y1: number; y2: number }[] } {
  const c = { ...DEFAULT_CONFIG, ...config };
  const barWidth = (c.canvasWidth - c.sidePadding * 2) / c.barsPerRow;
  const horizontal: { y: number; x1: number; x2: number }[] = [];
  const vertical: { x: number; y1: number; y2: number }[] = [];
  
  let currentY = c.topPadding;
  
  for (const section of sections) {
    currentY += c.sectionLabelHeight;
    const sectionStartY = currentY;
    
    // Horizontal lines (top of each row + bottom of last row)
    for (let row = 0; row <= section.rows; row++) {
      const y = sectionStartY + row * c.barHeight;
      horizontal.push({ y, x1: c.sidePadding, x2: c.canvasWidth - c.sidePadding });
    }
    
    // Vertical lines (bar separators)
    for (let bar = 0; bar <= c.barsPerRow; bar++) {
      const x = c.sidePadding + bar * barWidth;
      vertical.push({
        x,
        y1: sectionStartY,
        y2: sectionStartY + section.rows * c.barHeight,
      });
    }
    
    currentY += section.rows * c.barHeight + c.sectionGap;
  }
  
  return { horizontal, vertical };
}
