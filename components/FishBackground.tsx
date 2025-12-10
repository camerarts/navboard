
import React, { useEffect, useRef } from 'react';

interface FishProps {
  fishCount?: number;
  maxSpeed?: number;
  perceptionRadius?: number; // 感知半径（用于分离）
  separationStrength?: number; // 分离力度
  seekStrength?: number; // 追随力度
  wanderStrength?: number; // 漫游力度
  imagePaths?: string[]; // 图片路径数组
}

// 向量辅助类
class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(v: Vector) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n: number) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) {
      this.div(m);
    }
    return this;
  }

  limit(max: number) {
    if (this.mag() > max) {
      this.normalize();
      this.mult(max);
    }
    return this;
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  static sub(v1: Vector, v2: Vector) {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  copy() {
    return new Vector(this.x, this.y);
  }
}

class Fish {
  pos: Vector;
  vel: Vector;
  acc: Vector;
  maxSpeed: number;
  maxForce: number; // 转向力限制
  wobble: number; // 摆动相位
  size: number;
  color: string;
  image: HTMLImageElement | null;
  imageLoaded: boolean;
  angle: number;

  constructor(x: number, y: number, maxSpeed: number, imgUrl: string, color: string) {
    this.pos = new Vector(x, y);
    this.vel = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
    this.acc = new Vector(0, 0);
    this.maxSpeed = maxSpeed * (0.8 + Math.random() * 0.4); // 速度随机差异
    this.maxForce = 0.1;
    this.wobble = Math.random() * Math.PI * 2;
    this.size = 24 + Math.random() * 16; // 随机大小
    this.angle = 0;
    this.color = color;
    this.imageLoaded = false;
    this.image = null;

    if (imgUrl) {
      const img = new Image();
      img.src = imgUrl;
      img.onload = () => {
        this.imageLoaded = true;
        this.image = img;
      };
    }
  }

  applyForce(force: Vector) {
    this.acc.add(force);
  }

  // 行为：寻找目标（鼠标）
  seek(target: Vector, strength: number, arriveRadius: number = 100) {
    const desired = Vector.sub(target, this.pos);
    const d = desired.mag();

    // Arrive behavior: 接近时减速
    let speed = this.maxSpeed;
    if (d < arriveRadius) {
      speed = (d / arriveRadius) * this.maxSpeed;
    }

    desired.normalize();
    desired.mult(speed);

    const steer = Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    steer.mult(strength);
    this.applyForce(steer);
  }

  // 行为：分离（避免重叠）
  separate(fishes: Fish[], perceptionRadius: number, strength: number) {
    const steering = new Vector(0, 0);
    let total = 0;

    for (const other of fishes) {
      const d = Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y);
      if (other !== this && d < perceptionRadius) {
        const diff = Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d); // 距离越近，排斥力越大
        steering.add(diff);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.normalize();
      steering.mult(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce * 2); // 分离力权重通常大一些
      steering.mult(strength);
      this.applyForce(steering);
    }
  }

  // 行为：漫游（增加随机性）
  wander(strength: number) {
    const wanderR = 25;
    const wanderD = 80;
    const change = 0.3;
    this.wobble += Math.random() * change * 2 - change;
    
    // 计算前方的一个圆上的点
    const circlePos = this.vel.copy();
    circlePos.normalize();
    circlePos.mult(wanderD);
    circlePos.add(this.pos);

    const h = this.vel.heading();
    const circleOffset = new Vector(
      wanderR * Math.cos(this.wobble + h),
      wanderR * Math.sin(this.wobble + h)
    );
    
    const target = circlePos.add(circleOffset);
    this.seek(target, strength, 0);
  }

  // 行为：边界处理（软推回）
  boundaries(width: number, height: number) {
    const margin = 50;
    const desired = null;
    const force = new Vector(0, 0);
    const maxSpeed = this.maxSpeed;

    if (this.pos.x < margin) force.x = maxSpeed;
    else if (this.pos.x > width - margin) force.x = -maxSpeed;

    if (this.pos.y < margin) force.y = maxSpeed;
    else if (this.pos.y > height - margin) force.y = -maxSpeed;

    if (force.x !== 0 || force.y !== 0) {
      force.normalize();
      force.mult(maxSpeed);
      const steer = Vector.sub(force, this.vel);
      steer.limit(this.maxForce);
      this.applyForce(steer);
    }
  }

  update(deltaTime: number) {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel); // 简化：不乘 deltaTime，假设 60fps 基准，防止过大跳跃
    this.acc.mult(0); // 重置加速度

    // 更新摆动相位
    this.wobble += 0.1;
    
    // 平滑旋转
    const desiredAngle = this.vel.heading();
    // 简单的角度插值
    this.angle = desiredAngle;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    // 稍微根据摆动变形
    // const scaleY = 1 + Math.sin(this.wobble) * 0.1;
    // ctx.scale(1, scaleY);

    if (this.imageLoaded && this.image) {
      // 假设鱼图朝向右侧
      ctx.drawImage(this.image, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // 兜底绘制：画个小鱼形状
      ctx.fillStyle = this.color;
      ctx.beginPath();
      // 身体
      ctx.ellipse(0, 0, this.size / 1.5, this.size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // 尾巴
      ctx.beginPath();
      ctx.moveTo(-this.size / 2, 0);
      ctx.lineTo(-this.size, -this.size / 3);
      ctx.lineTo(-this.size, this.size / 3);
      ctx.fill();
    }

    ctx.restore();
  }
}

const DEFAULT_IMAGES = [
  '/fish/1.png',
  '/fish/2.png',
  '/fish/3.png',
  '/fish/4.png',
  '/fish/5.png',
  '/fish/6.png',
];

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', '#DDA0DD'];

const FishBackground: React.FC<FishProps> = ({
  fishCount = 6,
  maxSpeed = 3,
  perceptionRadius = 80,
  separationStrength = 1.8,
  seekStrength = 1.2,
  wanderStrength = 0.5,
  imagePaths = DEFAULT_IMAGES
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fishesRef = useRef<Fish[]>([]);
  const targetRef = useRef<Vector | null>(null);
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isReducedMotion = useRef(false);

  useEffect(() => {
    // 检查减弱动态设置
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReducedMotion.current = mediaQuery.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion.current = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // 初始化鱼
    const initFishes = (width: number, height: number) => {
      fishesRef.current = [];
      const actualCount = isReducedMotion.current ? 2 : fishCount;
      const actualSpeed = isReducedMotion.current ? maxSpeed * 0.2 : maxSpeed;

      for (let i = 0; i < actualCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const imgPath = imagePaths[i % imagePaths.length];
        const color = COLORS[i % COLORS.length];
        fishesRef.current.push(new Fish(x, y, actualSpeed, imgPath, color));
      }
    };

    // 尺寸调整
    const handleResize = () => {
      if (containerRef.current && canvas) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);
        
        // 如果鱼还没初始化或数量不对，重新初始化
        if (fishesRef.current.length === 0) {
          initFishes(width, height);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 鼠标交互
    const handleMouseMove = (e: MouseEvent) => {
      if (isReducedMotion.current) return;
      const rect = canvas.getBoundingClientRect();
      targetRef.current = new Vector(e.clientX - rect.left, e.clientY - rect.top);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
        if (isReducedMotion.current) return;
        if(e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            targetRef.current = new Vector(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        }
    }
    
    // 鼠标离开时清除目标，鱼群恢复漫游
    const handleMouseLeave = () => {
       targetRef.current = null;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseLeave);
    window.addEventListener('mouseout', handleMouseLeave);

    // 动画循环
    const render = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current; // 可以用于校正帧率，这里简单略过
      lastTimeRef.current = time;

      if (!containerRef.current || !ctx) return;
      const { width, height } = containerRef.current.getBoundingClientRect();

      ctx.clearRect(0, 0, width, height);

      // 物理更新
      for (const fish of fishesRef.current) {
        fish.boundaries(width, height);
        fish.separate(fishesRef.current, perceptionRadius, separationStrength);

        if (targetRef.current && !isReducedMotion.current) {
          fish.seek(targetRef.current, seekStrength);
        } else {
          fish.wander(wanderStrength);
        }

        fish.update(deltaTime);
        fish.draw(ctx);
      }

      frameIdRef.current = requestAnimationFrame(render);
    };

    frameIdRef.current = requestAnimationFrame(render);

    // 页面不可见时暂停
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameIdRef.current);
      } else {
        lastTimeRef.current = 0;
        frameIdRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseLeave);
      window.removeEventListener('mouseout', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      mediaQuery.removeEventListener('change', handleMotionChange);
      cancelAnimationFrame(frameIdRef.current);
    };
  }, [fishCount, maxSpeed, perceptionRadius, separationStrength, seekStrength, wanderStrength, imagePaths]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }} // 确保在背景层，但在内容层之下。App.tsx 的 z-index 设置很重要
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default FishBackground;
