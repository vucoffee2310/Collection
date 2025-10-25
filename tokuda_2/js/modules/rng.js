export class SeededRandom {
  constructor(seed) { 
    this.seed = seed; 
  }
  
  reset(seed) { 
    this.seed = seed; 
  }
  
  next() { 
    return (this.seed = (this.seed * 9301 + 49297) % 233280) / 233280; 
  }
  
  nextInt(min, max) { 
    return Math.floor(this.next() * (max - min + 1)) + min; 
  }
}