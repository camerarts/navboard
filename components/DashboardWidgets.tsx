import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind, MapPin, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

// --- Helper Functions & Types ---

// Weather Codes Mapping (OpenMeteo WMO codes)
const getWeatherIcon = (code: number, size = 24, className = "") => {
  if (code === 0) return <Sun size={size} className={`text-orange-500 ${className}`} />;
  if (code >= 1 && code <= 3) return <Cloud size={size} className={`text-[var(--text-secondary)] ${className}`} />;
  if (code >= 45 && code <= 48) return <CloudFog size={size} className={`text-slate-400 ${className}`} />;
  if (code >= 51 && code <= 67) return <CloudRain size={size} className={`text-blue-500 ${className}`} />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className={`text-sky-300 ${className}`} />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className={`text-blue-600 ${className}`} />;
  if (code >= 95 && code <= 99) return <CloudLightning size={size} className={`text-purple-500 ${className}`} />;
  return <Sun size={size} className={`text-orange-500 ${className}`} />;
};

// Calendar Helpers
const getLunarDate = (date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      day: 'numeric',
      month: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    const m = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const d = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    
    if (!m || !d) return '';

    const cnNums = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    
    let monthStr = '';
    // Standard Chinese Month Naming
    if (m === 1) monthStr = '正月';
    else if (m <= 10) monthStr = cnNums[m] + '月';
    else if (m === 11) monthStr = '十一月';
    else if (m === 12) monthStr = '腊月';
    else monthStr = m + '月';
    
    let dayStr = '';
    if (d <= 10) dayStr = '初' + (d === 10 ? '十' : cnNums[d]);
    else if (d < 20) dayStr = '十' + cnNums[d % 10];
    else if (d === 20) dayStr = '二十';
    else if (d < 30) dayStr = '廿' + cnNums[d % 10];
    else if (d === 30) dayStr = '三十';
    
    return `${monthStr}${dayStr}`;
  } catch (e) {
    return '';
  }
};

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// --- Sub-Components ---

const CalendarCard: React.FC = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000); // Update every second for dynamic time
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-2xl p-3 md:p-4 shadow-sm border border-[var(--border-color)] h-32 flex items-center justify-between relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-500 w-full">
      <div className="flex flex-col items-center justify-center bg-red-500 text-white rounded-2xl w-12 h-16 md:w-16 md:h-20 shadow-red-200/50 shadow-lg shrink-0 transform group-hover:scale-110 transition-transform duration-500">
        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider bg-red-600 w-full text-center py-1 rounded-t-2xl">
          {date.getMonth() + 1}月
        </span>
        <span className="text-xl md:text-2xl font-black tracking-tighter leading-none py-1 md:py-2">
          {date.getDate()}
        </span>
      </div>
      <div className="flex-1 pl-3 flex flex-col justify-center min-w-0">
        <h3 className="text-sm md:text-base font-bold text-[var(--text-primary)] mb-0.5 truncate">{WEEKDAYS[date.getDay()]}</h3>
        <p className="text-[10px] text-[var(--text-secondary)] font-medium truncate">{getLunarDate(date)}</p>
        <p className="text-base md:text-lg font-mono text-[var(--text-primary)] mt-1 tracking-widest truncate opacity-90 font-semibold">
            {date.toLocaleTimeString('en-GB', { hour12: false })}
        </p>
      </div>
    </div>
  );
};

const WeatherCard: React.FC = () => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('不支持定位');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&foreground=true`
          );
          const data = await res.json();
          const locationName = data.timezone ? data.timezone.split('/')[1].replace('_', ' ') : '本地';
          setWeather({ ...data, locationName });
        } catch (err) {
          setError('获取失败');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setError('无法定位');
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-[var(--border-color)] h-32 flex items-center justify-center w-full">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-[var(--border-color)] h-32 flex flex-col items-center justify-center text-[var(--text-secondary)] gap-2 w-full">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <AlertTriangle size={14} className="text-yellow-500" />
            {error}
        </div>
        <button onClick={() => window.location.reload()} className="text-xs text-blue-500 mt-1 hover:underline">刷新</button>
      </div>
    );
  }

  const current = weather.current;
  const daily = weather.daily;

  return (
    <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-[var(--border-color)] h-32 flex hover:shadow-xl hover:scale-[1.02] transition-all duration-500 overflow-hidden w-full relative items-center">
      {/* Current Weather Container */}
      <div className="flex flex-col items-start justify-between w-full md:w-auto md:min-w-[160px] md:max-w-[40%] md:pr-4 md:mr-1 md:border-r border-[var(--border-color)] h-full py-1">
        
        {/* Top Row on Mobile: Location */}
        <div className="w-full flex justify-between items-center">
             <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate font-medium block max-w-[120px]" title={weather.locationName}>{weather.locationName}</span>
            </div>
            <span className="md:hidden text-[10px] text-[var(--text-secondary)] font-bold">今日</span>
        </div>
        
        {/* Middle Row: Temp & Icon */}
        <div className="flex items-center gap-3 mt-1 mb-1">
             {getWeatherIcon(current.weather_code, 36, "w-8 h-8 md:w-7 md:h-7")}
             <span className="text-4xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tighter">{Math.round(current.temperature_2m)}°</span>
        </div>

        {/* Bottom Row: High/Low */}
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] font-medium">
            <span className="whitespace-nowrap">H: {Math.round(daily.temperature_2m_max[0])}°</span>
            <span className="whitespace-nowrap">L: {Math.round(daily.temperature_2m_min[0])}°</span>
        </div>
      </div>

      {/* Forecast (Strictly hidden on mobile, visible on desktop) */}
      <div className="hidden md:grid flex-1 grid-cols-5 gap-0.5 pl-0.5 h-full">
        {daily.time.slice(1, 6).map((dateStr: string, index: number) => {
            const date = new Date(dateStr);
            const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
            return (
                <div key={dateStr} className="flex flex-col items-center justify-center gap-0.5 h-full rounded-lg hover:bg-[var(--bg-subtle)]/50 transition-colors group/day">
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] scale-90">{dayName}</span>
                    {getWeatherIcon(daily.weather_code[index + 1], 16, "drop-shadow-sm my-0.5 group-hover/day:scale-110 transition-transform")}
                    <span className="text-xs font-bold text-[var(--text-primary)]">{Math.round(daily.temperature_2m_max[index + 1])}°</span>
                </div>
            );
        })}
      </div>
    </div>
  );
};

const ClockCard: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    let frameId: number;
    const update = () => {
      setTime(new Date());
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDeg = (seconds / 60) * 360;
  const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = ((hours % 12 + minutes / 60) / 12) * 360;

  return (
    <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-2xl p-2 shadow-sm border border-[var(--border-color)] h-32 flex items-center justify-center hover:shadow-xl hover:scale-[1.02] transition-all duration-500 relative w-full group overflow-hidden">
        {/* Subtle decorative glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-subtle)]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
        
        <div className="relative w-24 h-24 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
            {/* Clock Face Background */}
            <div className="absolute inset-0 rounded-full bg-[var(--bg-subtle)]/20 border border-[var(--border-color)]/60" />

            {/* Numbers 1-12 */}
            {[...Array(12)].map((_, i) => {
                const num = i + 1;
                // -90 degrees because 0 is at 3 o'clock
                const angleRad = (num * 30 - 90) * (Math.PI / 180);
                const radius = 38; // Percentage for positioning
                // Calculate position (50% is center)
                const left = 50 + radius * Math.cos(angleRad);
                const top = 50 + radius * Math.sin(angleRad);
                
                return (
                    <span 
                        key={num} 
                        className="absolute text-[10px] font-semibold text-[var(--text-secondary)]/70 select-none"
                        style={{ 
                            left: `${left}%`, 
                            top: `${top}%`, 
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        {num}
                    </span>
                );
            })}

            {/* Center Dot */}
            <div className="absolute w-1.5 h-1.5 bg-[var(--text-primary)] rounded-full z-30 shadow-sm ring-2 ring-[var(--bg-card)]" />

            {/* Hour Hand */}
            <div 
                className="absolute w-1.5 h-6 bg-[var(--text-primary)] rounded-full z-10 origin-bottom shadow-sm"
                style={{ 
                    bottom: '50%', 
                    left: '50%', 
                    transform: `translateX(-50%) rotate(${hourDeg}deg)` 
                }} 
            />

            {/* Minute Hand */}
            <div 
                className="absolute w-1 h-9 bg-[var(--text-secondary)] rounded-full z-20 origin-bottom opacity-80 shadow-sm"
                style={{ 
                    bottom: '50%', 
                    left: '50%',
                     transform: `translateX(-50%) rotate(${minuteDeg}deg)`
                }} 
            />

            {/* Second Hand */}
            <div 
                className="absolute w-0.5 h-10 bg-blue-500 rounded-full z-20 origin-bottom shadow-sm"
                style={{ 
                    bottom: '50%', 
                    left: '50%',
                    transform: `translateX(-50%) rotate(${secondDeg}deg)`
                }} 
            />
        </div>
    </div>
  );
};

const IPCard: React.FC = () => {
  const [ipData, setIpData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://ipwho.is/')
      .then(res => res.json())
      .then(data => {
        setIpData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-[var(--border-color)] h-32 flex items-center justify-center w-full">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-2xl p-3 md:p-5 shadow-sm border border-[var(--border-color)] h-32 flex flex-col justify-center hover:shadow-xl hover:scale-[1.02] transition-all duration-500 w-full">
       {!ipData || !ipData.success ? (
           <div className="text-center">
               <p className="text-[var(--text-secondary)] text-xs">获取失败</p>
               <button onClick={() => window.location.reload()} className="mt-2 text-blue-500"><RefreshCw size={16} /></button>
           </div>
       ) : (
           <div className="space-y-1 w-full">
               <div>
                   <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">Current IP</span>
                   <div className="text-lg md:text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight truncate" title={ipData.ip}>
                       {ipData.ip}
                   </div>
               </div>
               
               <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mt-1 pt-2 border-t border-[var(--border-color)]">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 animate-pulse"></span>
                   <span className="truncate font-medium">{ipData.city}, {ipData.country}</span>
               </div>
               
               <div className="text-[9px] text-[var(--text-secondary)] font-mono truncate opacity-70">
                   {ipData.connection?.org || ipData.connection?.isp || 'ISP Unknown'}
               </div>
           </div>
       )}
    </div>
  );
};

const DashboardWidgets: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-3 w-full mx-auto mb-8 relative z-20 md:grid-cols-2 xl:flex xl:flex-nowrap xl:items-stretch xl:gap-4">
        {/* Calendar */}
        <div className="w-full xl:w-[20%] min-w-0">
          <CalendarCard />
        </div>
        
        {/* Weather */}
        <div className="w-full xl:w-[35%] min-w-0">
          <WeatherCard />
        </div>

        {/* Clock */}
        <div className="w-full xl:w-[15%] min-w-0">
           <ClockCard />
        </div>

        {/* IP */}
        <div className="w-full xl:w-[30%] min-w-0">
           <IPCard />
        </div>
    </div>
  );
};

export default DashboardWidgets;
