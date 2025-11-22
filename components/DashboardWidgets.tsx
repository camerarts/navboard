import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind, MapPin, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

// --- Helper Functions & Types ---

// Weather Codes Mapping (OpenMeteo WMO codes)
const getWeatherIcon = (code: number, size = 24, className = "") => {
  if (code === 0) return <Sun size={size} className={`text-orange-500 ${className}`} />;
  if (code >= 1 && code <= 3) return <Cloud size={size} className={`text-slate-500 ${className}`} />;
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
    // Use Intl to get the Chinese calendar date string
    const lunarString = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric',
    }).format(date);
    
    // Simple mapping to make it look more traditional if Intl returns digits
    // Note: Modern browsers usually return "十月22" or similar. 
    // We prefix "农历" as requested.
    return `农历 ${lunarString}`;
  } catch (e) {
    return '农历数据不可用';
  }
};

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// --- Sub-Components ---

const CalendarCard: React.FC = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000); // Update every minute is enough for date
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-36 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex flex-col items-center justify-center bg-red-500 text-white rounded-2xl w-20 h-24 shadow-red-200 shadow-lg shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider bg-red-600 w-full text-center py-1 rounded-t-2xl">
          {date.getMonth() + 1}月
        </span>
        <span className="text-4xl font-black tracking-tighter leading-none py-2">
          {date.getDate()}
        </span>
      </div>
      <div className="flex-1 pl-5 flex flex-col justify-center">
        <h3 className="text-xl font-bold text-slate-800 mb-1">{WEEKDAYS[date.getDay()]}</h3>
        <p className="text-sm text-slate-500 font-medium">{getLunarDate(date)}</p>
        <p className="text-2xl font-mono text-slate-700 mt-2 tracking-widest">
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
      setError('不支持地理位置');
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
          
          // Get city name (reverse geocoding mock or just show coords/region if needed, 
          // for simplicity we use a generic label or the timezone region)
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
        setError('无法获取位置');
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-36 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-36 flex flex-col items-center justify-center text-slate-400 gap-2">
        <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
            获取失败
            <MapPin size={16} />
            <AlertTriangle size={16} className="text-yellow-500" />
        </div>
        <p className="text-xs">{weather?.locationName || '杭州'}</p>
        <p className="text-xs mt-1 text-center max-w-[150px]">天气数据获取失败 - HTTP状态码: 500</p>
        <button onClick={() => window.location.reload()} className="text-xs text-blue-500 mt-1 hover:underline">点击重试</button>
      </div>
    );
  }

  const current = weather.current;
  const daily = weather.daily;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 h-36 flex hover:shadow-md transition-shadow overflow-hidden">
      {/* Left: Current */}
      <div className="w-1/3 flex flex-col justify-between border-r border-slate-100 pr-4 mr-4">
        <div>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            <MapPin size={10} />
            <span className="truncate">{weather.locationName}</span>
          </div>
          <div className="flex items-center gap-2">
             {getWeatherIcon(current.weather_code, 32)}
             <span className="text-2xl font-bold text-slate-800">{Math.round(current.temperature_2m)}°</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400">
            H:{Math.round(daily.temperature_2m_max[0])}° L:{Math.round(daily.temperature_2m_min[0])}°
        </div>
      </div>

      {/* Right: Forecast */}
      <div className="flex-1 flex justify-between items-center">
        {daily.time.slice(1, 6).map((dateStr: string, index: number) => {
            const date = new Date(dateStr);
            const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
            return (
                <div key={dateStr} className="flex flex-col items-center gap-1.5 min-w-[30px]">
                    <span className="text-[10px] text-slate-400 font-medium">{dayName}</span>
                    {getWeatherIcon(daily.weather_code[index + 1], 18)}
                    <span className="text-[10px] font-bold text-slate-600">{Math.round(daily.temperature_2m_max[index + 1])}°</span>
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
    const timer = requestAnimationFrame(function update() {
      setTime(new Date());
      requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDeg = (seconds / 60) * 360;
  const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = ((hours % 12 + minutes / 60) / 12) * 360;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 h-36 flex items-center justify-center hover:shadow-md transition-shadow relative">
        {/* Analog Clock Face */}
        <div className="relative w-24 h-24 rounded-full border-4 border-slate-100 bg-white shadow-inner flex items-center justify-center">
            {/* Dial Markers */}
            {[...Array(12)].map((_, i) => (
                <div 
                    key={i} 
                    className="absolute w-0.5 h-2 bg-slate-300 origin-bottom"
                    style={{ 
                        top: '4px', 
                        left: 'calc(50% - 1px)', 
                        transformOrigin: '50% 42px', // Center of clock (radius - padding) approx
                        transform: `rotate(${i * 30}deg)` 
                    }}
                />
            ))}

            {/* Hands */}
            {/* Hour */}
            <div 
                className="absolute w-1.5 h-6 bg-slate-800 rounded-full origin-bottom z-10"
                style={{ 
                    bottom: '50%', 
                    left: 'calc(50% - 3px)',
                    transform: `rotate(${hourDeg}deg)` 
                }} 
            />
            {/* Minute */}
            <div 
                className="absolute w-1 h-9 bg-slate-600 rounded-full origin-bottom z-20"
                style={{ 
                    bottom: '50%', 
                    left: 'calc(50% - 2px)',
                    transform: `rotate(${minuteDeg}deg)` 
                }} 
            />
            {/* Second */}
            <div 
                className="absolute w-0.5 h-10 bg-red-500 rounded-full origin-bottom z-30"
                style={{ 
                    bottom: '50%', 
                    left: 'calc(50% - 1px)',
                    transform: `rotate(${secondDeg}deg)` 
                }} 
            />
            {/* Center Dot */}
            <div className="absolute w-3 h-3 bg-slate-800 rounded-full z-40 border-2 border-white shadow-sm" />
        </div>
    </div>
  );
};

const IPCard: React.FC = () => {
  const [ipData, setIpData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch IP data
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
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-36 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-36 flex flex-col justify-center hover:shadow-md transition-shadow">
       {!ipData || !ipData.success ? (
           <div className="text-center">
               <p className="text-slate-400 text-sm">IP 信息获取失败</p>
               <button onClick={() => window.location.reload()} className="mt-2 text-blue-500"><RefreshCw size={16} /></button>
           </div>
       ) : (
           <div className="space-y-3">
               <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">当前IP</span>
                   <div className="text-lg font-bold text-slate-800 font-mono tracking-tight">{ipData.ip}</div>
                   <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                       <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                       {ipData.city}, {ipData.country}
                   </div>
               </div>
               
               <div className="pt-2 border-t border-slate-50">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">代理IP / ISP</span>
                   {/* Usually "Proxy IP" in standard requests means the visible public IP. 
                       If they are behind a proxy, this IS the proxy IP. 
                       We show ISP/Org to give more info. */}
                   <div className="text-sm font-medium text-slate-700 font-mono truncate" title={ipData.connection?.isp}>
                       {ipData.connection?.org || ipData.connection?.isp || 'Unknown'}
                   </div>
                   <div className="text-[10px] text-slate-400 truncate mt-0.5">
                       {ipData.timezone?.id}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

const DashboardWidgets: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-5xl mx-auto mb-8 relative z-20">
      <CalendarCard />
      <WeatherCard />
      <ClockCard />
      <IPCard />
    </div>
  );
};

export default DashboardWidgets;