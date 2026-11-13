import React, { useState, useMemo } from 'react';
import {
  Scale,
  ArrowRightLeft,
  Copy,
  Check,
  ChevronDown
} from 'lucide-react';

interface UnitConverterProps {
  onStatusChange: (msg: string) => void;
}

type CategoryType = 'Length & Distance' | 'Weight & Mass' | 'Temperature' | 'Speed';

export const UnitConverter: React.FC<UnitConverterProps> = ({ onStatusChange }) => {
  const [category, setCategory] = useState<CategoryType>('Length & Distance');
  const [inputValue, setInputValue] = useState<string>('10');
  const [fromUnit, setFromUnit] = useState<string>('Meters');
  const [toUnit, setToUnit] = useState<string>('Feet');
  const [copied, setCopied] = useState<boolean>(false);

  const unitConfig = useMemo(() => {
    return {
      'Length & Distance': {
        units: ['Meters', 'Kilometers', 'Centimeters', 'Miles', 'Feet', 'Inches'],
        rates: {
          Meters: 1.0,
          Kilometers: 1000.0,
          Centimeters: 0.01,
          Miles: 1609.344,
          Feet: 0.3048,
          Inches: 0.0254,
        },
      },
      'Weight & Mass': {
        units: ['Kilograms', 'Grams', 'Pounds (lb)', 'Ounces (oz)'],
        rates: {
          Kilograms: 1.0,
          Grams: 0.001,
          'Pounds (lb)': 0.45359237,
          'Ounces (oz)': 0.0283495,
        },
      },
      Temperature: {
        units: ['Celsius', 'Fahrenheit', 'Kelvin'],
        rates: {},
      },
      Speed: {
        units: ['km/h (Kilometers per hour)', 'mph (Miles per hour)', 'm/s (Meters per sec)'],
        rates: {
          'km/h (Kilometers per hour)': 0.277778,
          'mph (Miles per hour)': 0.44704,
          'm/s (Meters per sec)': 1.0,
        },
      },
    };
  }, []);

  const handleCategoryChange = (newCat: CategoryType) => {
    setCategory(newCat);
    const available = unitConfig[newCat].units;
    setFromUnit(available[0]);
    setToUnit(available[1] || available[0]);
  };

  const swapUnits = () => {
    const f = fromUnit;
    const t = toUnit;
    setFromUnit(t);
    setToUnit(f);
  };

  const convertedResult = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return '0';

    if (category === 'Temperature') {
      if (fromUnit === toUnit) return val.toFixed(2);
      if (fromUnit === 'Celsius' && toUnit === 'Fahrenheit') return ((val * 9) / 5 + 32).toFixed(2);
      if (fromUnit === 'Celsius' && toUnit === 'Kelvin') return (val + 273.15).toFixed(2);
      if (fromUnit === 'Fahrenheit' && toUnit === 'Celsius') return (((val - 32) * 5) / 9).toFixed(2);
      if (fromUnit === 'Kelvin' && toUnit === 'Celsius') return (val - 273.15).toFixed(2);
      return val.toFixed(2);
    }

    const rates = unitConfig[category].rates as { [key: string]: number };
    const fromRate = rates[fromUnit] || 1;
    const toRate = rates[toUnit] || 1;

    const base = val * fromRate;
    const res = base / toRate;
    return Number(res.toFixed(4)).toString();
  }, [category, fromUnit, toUnit, inputValue, unitConfig]);

  const copyResult = () => {
    navigator.clipboard.writeText(convertedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onStatusChange(`Copied ${convertedResult} ${toUnit}!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Scale className="w-4 h-4" />
          <span>Neumorphic Unit Converter</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          High-Precision Measurement Converter
        </h2>
        <p className="text-xs text-slate-500">
          Seamlessly calculate metric, imperial, and temperature conversions with live feedback.
        </p>
      </div>

      {/* Category Pills (Matching reference Select Category pill style) */}
      <div className="flex flex-wrap gap-2.5">
        {(Object.keys(unitConfig) as CategoryType[]).map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
              category === cat
                ? 'neu-blue-pill text-white'
                : 'neu-btn text-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Converter Card */}
      <div className="neu-flat p-7 rounded-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* From Side */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              From Unit
            </span>
            <div className="neu-inset px-4 py-2.5 rounded-2xl flex items-center justify-between">
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="w-full bg-transparent border-0 text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                {unitConfig[category].units.map((u) => (
                  <option key={u} value={u} className="bg-[#EBF0F7]">
                    {u}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pt-1">
              Input Value
            </span>
            <div className="neu-inset px-4 py-2.5 rounded-2xl flex items-center">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-transparent border-0 text-lg font-mono font-extrabold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Swap Pill in Center */}
          <div className="md:col-span-1 flex justify-center pt-5">
            <button
              onClick={swapUnits}
              className="neu-btn w-11 h-11 rounded-full flex items-center justify-center text-blue-600"
              title="Swap Units"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* To Side */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              To Unit
            </span>
            <div className="neu-inset px-4 py-2.5 rounded-2xl flex items-center justify-between">
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="w-full bg-transparent border-0 text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                {unitConfig[category].units.map((u) => (
                  <option key={u} value={u} className="bg-[#EBF0F7]">
                    {u}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pt-1">
              Calculated Result
            </span>
            <div className="neu-flat-sm px-4 py-2.5 rounded-2xl flex items-center justify-between">
              <span className="font-mono text-lg font-extrabold text-blue-600 truncate">
                {convertedResult}
              </span>
              <button
                onClick={copyResult}
                className="neu-btn p-1.5 rounded-xl text-blue-600 ml-2"
                title="Copy Result"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Readout Bar */}
        <div className="neu-inset p-4 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500">Live Formulation:</span>
          <span className="text-slate-800 font-mono font-bold">
            {inputValue || 0} {fromUnit} = <span className="text-blue-600 font-extrabold">{convertedResult}</span> {toUnit}
          </span>
        </div>
      </div>
    </div>
  );
};
