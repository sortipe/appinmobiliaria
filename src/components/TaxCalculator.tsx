import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator, 
  DollarSign, 
  RefreshCw, 
  Share2, 
  Info,
  TrendingUp,
  Landmark,
  Check,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const TaxCalculator: React.FC = () => {
  // Constants
  const DEFAULT_UIT = 5350;
  const DEFAULT_TC = 3.85;

  // State
  const [salePriceUSD, setSalePriceUSD] = useState<string>('100000');
  const [purchasePriceUSD, setPurchasePriceUSD] = useState<string>('50000');
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_TC);
  const [uitValue, setUitValue] = useState<number>(DEFAULT_UIT);
  const [isLoadingTC, setIsLoadingTC] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [tcError, setTcError] = useState(false);

  // Calculations
  const salePricePEN = (parseFloat(salePriceUSD) || 0) * exchangeRate;
  const purchasePricePEN = (parseFloat(purchasePriceUSD) || 0) * exchangeRate;
  const capitalGain = Math.max(0, salePricePEN - purchasePricePEN);
  const rentTax = capitalGain * 0.05;

  const alcabalaDeduction = uitValue * 10;
  const taxableAmountAlcabala = Math.max(0, salePricePEN - alcabalaDeduction);
  const alcabalaTax = taxableAmountAlcabala * 0.03;

  // Fetch Exchange Rate
  const fetchExchangeRate = useCallback(async () => {
    setIsLoadingTC(true);
    setTcError(false);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      if (data.rates && data.rates.PEN) {
        setExchangeRate(parseFloat(data.rates.PEN.toFixed(3)));
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error('Rate not found');
      }
    } catch (error) {
      console.error('Error fetching TC:', error);
      setTcError(true);
    } finally {
      setIsLoadingTC(false);
    }
  }, []);

  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  // Share / Copy to Clipboard
  const handleShare = () => {
    const summary = `
📊 RESUMEN CALCULADORA INMOBILIARIA PERÚ 2025
-------------------------------------------
💰 VENTA: $${parseFloat(salePriceUSD).toLocaleString()} (S/ ${salePricePEN.toLocaleString()})
🏠 COMPRA: $${parseFloat(purchasePriceUSD).toLocaleString()} (S/ ${purchasePricePEN.toLocaleString()})

🔸 IMPUESTO A LA RENTA (Vendedor):
   Ganancia: S/ ${capitalGain.toLocaleString()}
   TOTAL A PAGAR: S/ ${rentTax.toLocaleString()} ($${(rentTax / exchangeRate).toFixed(2)})

🔹 IMPUESTO DE ALCABALA (Comprador):
   Monto Imponible: S/ ${taxableAmountAlcabala.toLocaleString()}
   TOTAL A PAGAR: S/ ${alcabalaTax.toLocaleString()} ($${(alcabalaTax / exchangeRate).toFixed(2)})

⚙️ T. Cambio: ${exchangeRate} | UIT: S/ ${uitValue}
-------------------------------------------
Generado por AppInmobiliaria
    `.trim();

    navigator.clipboard.writeText(summary);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const formatCurrency = (val: number) => 
    val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-full bg-slate-100/50 p-4 md:p-8 rounded-3xl animate-in fade-in duration-700">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Widget */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="bg-brand-500 p-3 rounded-2xl shadow-lg shadow-brand-100">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">Calculadora Inmobiliaria</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Renta (5%) & Alcabala (3%)</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Perú 2025</p>
              <p className="text-sm font-bold text-slate-700">UIT: S/ {uitValue.toLocaleString()}</p>
            </div>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold text-sm shadow-xl active:scale-95"
            >
              {showCopyFeedback ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              {showCopyFeedback ? 'Copiado' : 'Compartir'}
            </button>
          </div>
        </motion.div>

        {/* Inputs Bento Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Venta (USD)
            </label>
            <input 
              type="number" 
              value={salePriceUSD}
              onChange={(e) => setSalePriceUSD(e.target.value)}
              className="w-full text-xl font-black text-slate-900 outline-none focus:text-brand-600 transition-colors"
            />
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Compra (USD)
            </label>
            <input 
              type="number" 
              value={purchasePriceUSD}
              onChange={(e) => setPurchasePriceUSD(e.target.value)}
              className="w-full text-xl font-black text-slate-900 outline-none focus:text-brand-600 transition-colors"
            />
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${isLoadingTC ? 'animate-spin' : ''}`} /> T. Cambio
            </label>
            <div className="flex items-center justify-between">
              <input 
                type="number" 
                step="0.001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                className="w-full text-xl font-black text-slate-900 outline-none"
              />
              <button 
                onClick={fetchExchangeRate}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoadingTC ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {lastUpdated && !tcError && (
              <span className="absolute bottom-1 right-3 text-[8px] text-slate-300 font-bold">Act: {lastUpdated}</span>
            )}
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Landmark className="w-3 h-3" /> UIT (S/)
            </label>
            <input 
              type="number" 
              value={uitValue}
              onChange={(e) => setUitValue(parseInt(e.target.value))}
              className="w-full text-xl font-black text-slate-900 outline-none"
            />
          </div>
        </div>

        {tcError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 text-amber-700 text-sm font-medium"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            Error al conectar con la API de tipo de cambio. Se usará el valor por defecto.
          </motion.div>
        )}

        {/* Main Tax Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Renta Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100"
          >
            <div className="bg-amber-500 px-8 py-4 flex justify-between items-center">
              <h2 className="text-white font-black uppercase tracking-widest text-sm">Impuesto Renta (5%)</h2>
              <span className="text-amber-100 text-[10px] font-bold uppercase tracking-tighter">Ganancia Capital</span>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400 uppercase tracking-tighter">Valor Venta</span>
                  <span className="text-slate-700">S/ {formatCurrency(salePricePEN)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400 uppercase tracking-tighter">Valor Compra</span>
                  <span className="text-slate-700">S/ {formatCurrency(purchasePricePEN)}</span>
                </div>
                <div className="bg-slate-50/80 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Rentabilidad</span>
                  <span className="text-lg font-black text-slate-900">S/ {formatCurrency(capitalGain)}</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Total a Pagar</p>
                <h3 className="text-4xl font-black text-amber-600">S/ {formatCurrency(rentTax)}</h3>
                <p className="text-sm font-bold text-amber-500/60 mt-1">USD {(rentTax / exchangeRate).toFixed(2)}</p>
              </div>
            </div>
          </motion.div>

          {/* Alcabala Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100"
          >
            <div className="bg-slate-900 px-8 py-4 flex justify-between items-center">
              <h2 className="text-white font-black uppercase tracking-widest text-sm">Alcabala (3%)</h2>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Transferencia</span>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400 uppercase tracking-tighter">Valor Venta</span>
                  <span className="text-slate-700">S/ {formatCurrency(salePricePEN)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400 uppercase tracking-tighter">Deducción (10 UIT)</span>
                  <span className="text-red-500">-S/ {formatCurrency(alcabalaDeduction)}</span>
                </div>
                <div className="bg-slate-50/80 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Monto Imponible</span>
                  <span className="text-lg font-black text-slate-900">S/ {formatCurrency(taxableAmountAlcabala)}</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Total a Pagar</p>
                <h3 className="text-4xl font-black text-slate-900">S/ {formatCurrency(alcabalaTax)}</h3>
                <p className="text-sm font-bold text-slate-500/60 mt-1">USD {(alcabalaTax / exchangeRate).toFixed(2)} approx.</p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Info Footer Box */}
        <div className="bg-blue-50/80 border border-blue-100 p-5 rounded-3xl flex gap-4">
          <div className="bg-blue-100 p-2 h-fit rounded-xl">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-[11px] leading-relaxed font-bold text-blue-800">
            <p className="mb-1 uppercase tracking-widest">Nota Legal y Tributaria:</p>
            <p className="opacity-80">
              El Impuesto a la Renta lo paga el <span className="underline decoration-blue-300">vendedor</span> (5% sobre la ganancia). 
              La Alcabala la paga el <span className="underline decoration-blue-300">comprador</span> (3% sobre el valor que exceda las 10 UIT). 
              El tipo de cambio es referencial obtenido de fuentes públicas. Cálculos vigentes para el periodo fiscal 2025.
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            © 2026 Calculadora Inmobiliaria Perú • Datos referenciales
          </p>
        </div>

      </div>
    </div>
  );
};

export default TaxCalculator;
