// src/utils/stats.ts

interface FileStats {
  path: string;
  originalSize: number;
  compressedSize: number;
  ratio: number; // Compression ratio as a percentage (compressed/original * 100)
}

export class Stats {
  private files: FileStats[] = [];

  addFile(stats: FileStats): void {
    this.files.push(stats);
  }

  get fileCount(): number {
    return this.files.length;
  }

  get totalOriginalSize(): number {
    return this.files.reduce((sum, file) => sum + file.originalSize, 0);
  }

  get totalCompressedSize(): number {
    return this.files.reduce((sum, file) => sum + file.compressedSize, 0);
  }

  get averageRatio(): number {
    if (this.files.length === 0) return 0;
    return (
      this.files.reduce((sum, file) => sum + file.ratio, 0) / this.files.length
    );
  }

  get estimatedTokensSaved(): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.floor((this.totalOriginalSize - this.totalCompressedSize) / 4);
  }

  get fileDetails(): FileStats[] {
    return [...this.files];
  }
}
