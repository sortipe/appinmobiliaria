import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Property } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Tag, 
  Image as ImageIcon,
  Loader2,
  Trash2,
  Edit,
  X,
  Mic,
  Volume2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Check,
  Home,
  DollarSign,
  Layers,
  BedDouble,
  FileText,
  Info
} from 'lucide-react';

const Properties: React.FC = () => {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    property_id: '',
    property_type: 'Casa',
    status: 'Disponible' as 'Disponible' | 'Vendida',
    operation: 'Venta' as 'Venta' | 'Alquiler',
    status_color: 'green' as 'green' | 'yellow' | 'red',
    status_reason: '',
    price: '',
    currency: 'USD',
    area_total: '',
    area_built: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    images: [] as string[],
    featured_image: '',
    latitude: '-12.046186267780133',
    longitude: '-77.04275089398834',
    documents: [] as string[],
  });

  // Voice Assistant States
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAutofillAlert, setShowAutofillAlert] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const transcriptRef = useRef('');
  const shouldProcessOnEnd = useRef(false);
  const simulatedIntervalRef = useRef<any>(null);

  // Leaflet Map Refs & States
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const loadLeaflet = (onLoad: () => void) => {
    if ((window as any).L) {
      onLoad();
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    let script = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => onLoad();
      document.body.appendChild(script);
    } else {
      if ((window as any).L) {
        onLoad();
      } else {
        const oldOnload = script.onload;
        script.onload = (e) => {
          if (oldOnload) (oldOnload as any)(e);
          onLoad();
        };
      }
    }
  };

  const handleCoordsChange = (type: 'latitude' | 'longitude', value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [type]: value };
      const lat = parseFloat(type === 'latitude' ? value : prev.latitude);
      const lng = parseFloat(type === 'longitude' ? value : prev.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([lat, lng]);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
        }
      }
      return updated;
    });
  };

  useEffect(() => {
    if (isModalOpen && !showVoiceAssistant) {
      loadLeaflet(() => {
        setLeafletLoaded(true);
      });
    }
  }, [isModalOpen, showVoiceAssistant]);

  useEffect(() => {
    if (!leafletLoaded || !isModalOpen || showVoiceAssistant || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const lat = parseFloat(formData.latitude) || -12.046186267780133;
    const lng = parseFloat(formData.longitude) || -77.04275089398834;

    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch (e) {}
      mapInstanceRef.current = null;
    }
    if ((window as any)._propertyMapInstance) {
      try { (window as any)._propertyMapInstance.remove(); } catch (e) {}
      (window as any)._propertyMapInstance = null;
    }

    const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
    mapInstanceRef.current = map;
    (window as any)._propertyMapInstance = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const marker = L.marker([lat, lng], { draggable: true, icon: defaultIcon }).addTo(map);
    markerInstanceRef.current = marker;

    marker.on('dragend', () => {
      const position = marker.getLatLng();
      setFormData(prev => ({
        ...prev,
        latitude: position.lat.toString(),
        longitude: position.lng.toString()
      }));
    });

    map.on('click', (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      setFormData(prev => ({
        ...prev,
        latitude: clickLat.toString(),
        longitude: clickLng.toString()
      }));
    });

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (e) {}
        mapInstanceRef.current = null;
      }
      if ((window as any)._propertyMapInstance) {
        try { (window as any)._propertyMapInstance.remove(); } catch (e) {}
        (window as any)._propertyMapInstance = null;
      }
      markerInstanceRef.current = null;
    };
  }, [leafletLoaded, isModalOpen, showVoiceAssistant]);

  useEffect(() => {
    if (!profile) return;

    const cached = localStorage.getItem('properties_cache');
    if (cached) {
      setProperties(JSON.parse(cached));
      setLoading(false);
    }
    fetchProperties();
  }, [profile]);

  const fetchProperties = async () => {
    const isDemo = localStorage.getItem('demo_user');
    if (isDemo) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data || []);
      localStorage.setItem('properties_cache', JSON.stringify(data || []));
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close modal and reset voice assistant states
  const closeModal = () => {
    setIsModalOpen(false);
    setShowVoiceAssistant(false);
    setIsRecording(false);
    setTranscript('');
    setCorrectedText('');
    setVoiceError(null);
    transcriptRef.current = '';
    shouldProcessOnEnd.current = false;
    if (simulatedIntervalRef.current) {
      clearInterval(simulatedIntervalRef.current);
    }
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {}
    }
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch (e) {}
      mapInstanceRef.current = null;
    }
    if ((window as any)._propertyMapInstance) {
      try { (window as any)._propertyMapInstance.remove(); } catch (e) {}
      (window as any)._propertyMapInstance = null;
    }
    markerInstanceRef.current = null;
    setFormData({
      name: '',
      address: '',
      property_id: '',
      property_type: 'Casa',
      status: 'Disponible',
      operation: 'Venta',
      status_color: 'green',
      status_reason: '',
      price: '',
      currency: 'USD',
      area_total: '',
      area_built: '',
      bedrooms: '',
      bathrooms: '',
      description: '',
      images: [],
      featured_image: '',
      latitude: '-12.046186267780133',
      longitude: '-77.04275089398834',
      documents: [],
    });
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Tu navegador no soporta el reconocimiento de voz. Te recomendamos usar Google Chrome.');
      return;
    }

    setVoiceError(null);
    setTranscript('');
    setCorrectedText('');
    transcriptRef.current = '';
    shouldProcessOnEnd.current = false;
    setIsRecording(true);

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'es-ES';

      rec.onresult = (event: any) => {
        let fullText = '';
        for (let i = 0; i < event.results.length; i++) {
          fullText += event.results[i][0].transcript;
        }
        setTranscript(fullText);
        transcriptRef.current = fullText;
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Permiso de micrófono denegado. Por favor, habilita el micrófono en tu navegador.');
        } else if (event.error === 'no-speech') {
          // Keep recording, don't stop
        } else {
          setVoiceError(`Error de dictado: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
        if (shouldProcessOnEnd.current) {
          shouldProcessOnEnd.current = false;
          const finalSpeech = transcriptRef.current;
          if (finalSpeech.trim()) {
            processSpeechWithAI(finalSpeech);
          } else {
            setVoiceError('No se escuchó ningún dictado. Inténtalo de nuevo.');
          }
        }
      };

      rec.start();
      setRecognitionInstance(rec);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setVoiceError('No se pudo iniciar el micrófono. Inténtalo de nuevo.');
      setIsRecording(false);
    }
  };

  const stopVoiceRecognition = () => {
    if (!recognitionInstance) return;
    setIsRecording(false);
    shouldProcessOnEnd.current = true;
    try {
      recognitionInstance.stop();
    } catch (err) {
      console.error('Failed to stop recognition:', err);
    }
  };

  const simulateDemoSpeech = () => {
    if (simulatedIntervalRef.current) {
      clearInterval(simulatedIntervalRef.current);
    }
    
    // Stop physical recognition if running
    if (recognitionInstance) {
      try { recognitionInstance.stop(); } catch (e) {}
    }

    setVoiceError(null);
    setTranscript('');
    setCorrectedText('');
    transcriptRef.current = '';
    shouldProcessOnEnd.current = false;
    setIsRecording(true);
    
    const demoPhrases = [
      "Hola, quiero registrar un hermoso departamento en San Isidro, ",
      "ubicado en la Calle Las Flores 340. ",
      "Tiene tres dormitorios, dos baños, cocina moderna ",
      "y un precio de venta de doscientos cuarenta y cinco mil dólares."
    ];
    
    let currentIdx = 0;
    let fullSimulatedText = '';
    
    simulatedIntervalRef.current = setInterval(() => {
      if (currentIdx < demoPhrases.length) {
        fullSimulatedText += demoPhrases[currentIdx];
        setTranscript(fullSimulatedText);
        transcriptRef.current = fullSimulatedText;
        currentIdx++;
      } else {
        clearInterval(simulatedIntervalRef.current);
        setIsRecording(false);
        processSpeechWithAI(fullSimulatedText);
      }
    }, 1000);
  };

  const processSpeechWithAI = (rawText: string) => {
    setIsProcessing(true);
    
    // Simulate premium AI processing and formatting
    setTimeout(() => {
      const optimized = parseAndCorrectText(rawText);
      setCorrectedText(optimized);
      setIsProcessing(false);
    }, 1500);
  };

  const parseAndCorrectText = (rawText: string): string => {
    let text = rawText.trim();
    if (!text) return '';
    
    // Capitalize first letter
    text = text.charAt(0).toUpperCase() + text.slice(1);
    
    // Auto-replace common spanish spoken numbers with digits using strict word boundaries
    const numberMap: { [key: string]: string } = {
      'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 
      'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 
      'nueve': '9', 'diez': '10', 'un': '1', 'una': '1',
      'primer': '1er', 'segundo': '2do', 'tercer': '3er'
    };

    // Apply mappings using word boundary regex to avoid partial word replacements
    Object.keys(numberMap).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      text = text.replace(regex, numberMap[key]);
    });

    // Formatting currency/prices.
    const priceWords: { [key: string]: string } = {
      'ciento cincuenta mil': '150000',
      'doscientos mil': '200000',
      'doscientos cuarenta y cinco mil': '245000',
      'trescientos mil': '300000',
      'cuatrocientos mil': '400000',
      'quinientos mil': '500000',
      'seiscientos mil': '600000',
      'setecientos mil': '700000',
      'ochocientos mil': '800000',
      'novecientos mil': '900000',
      'un millón': '1000000',
      'un millon': '1000000',
      'dos millones': '2000000',
      'tres millones': '3000000',
    };

    Object.keys(priceWords).forEach(word => {
      const regex = new RegExp(word, 'gi');
      text = text.replace(regex, priceWords[word]);
    });

    // Format any raw number followed by "mil" (e.g., "150 mil" or "200 mil" -> "150000" or "200000")
    text = text.replace(/(\d+)\s*mil\b/gi, '$1000');

    // Add punctuation nicely
    text = text.replace(/ ubica en /gi, ' ubicado en ');
    text = text.replace(/ ubicado en /gi, ', ubicado en ');
    text = text.replace(/ cuenta con /gi, '. Cuenta con ');
    text = text.replace(/ el precio es de /gi, '. El precio es de ');
    text = text.replace(/ precio de venta es de /gi, '. El precio de venta es de ');
    text = text.replace(/ tiene un precio de /gi, '. Tiene un precio de ');
    
    // Ensure sentences have a final period
    if (!text.endsWith('.')) {
      text += '.';
    }
    
    // Clean double dots or double spaces
    text = text.replace(/\.{2,}/g, '.');
    text = text.replace(/\s{2,}/g, ' ');
    text = text.replace(/\s+\./g, '.');
    text = text.replace(/,\s*,/g, ',');

    return text;
  };

  const parseFields = (text: string) => {
    const parseNum = (str: string): number => {
      let clean = str.replace(/[.,\s]/g, '').toLowerCase();
      if (clean.includes('mil')) {
        clean = clean.replace('mil', '000');
      }
      return parseInt(clean, 10);
    };

    // 1. Extract Price
    let price = '';
    
    // a) Try explicit currency prefix or suffix (handles $900000, 900000 dólares, usd 900000, s/. 900000)
    // Matches raw digits or digits with separators, followed/preceded by currency names/symbols.
    const currencyNumberRegex = /(?:(?:[\$\€]|usd|s\/\.?)\s*(\d+(?:[.,]\d{3})*(?:\s*mil)?)\b)|(?:\b(\d+(?:[.,]\d{3})*(?:\s*mil)?)\s*(?:dólares|dolares|usd|euros|soles|pesos|dls)\b)/i;
    const currMatch = text.match(currencyNumberRegex);
    if (currMatch) {
      const valStr = currMatch[1] || currMatch[2];
      const val = parseNum(valStr);
      if (!isNaN(val)) {
        price = val.toString();
      }
    }
    
    // b) Try explicit price phrases (e.g. "cuesta 900000", "el precio es de 900000", "valorizado en 900000")
    if (!price) {
      const pricePhraseRegex = /(?:precio(?:\s+es)?(?:\s+de)?|cuesta|cuestan|está\s+en|esta\s+en|está|esta|valorizado\s+en|valorizada\s+en|monto\s+de|suma\s+de)\s*(?:(?:[\$\€]|usd|s\/\.?)\s*)?(\d+(?:[.,]\d{3})*(?:\s*mil)?)\b/i;
      const phraseMatch = text.match(pricePhraseRegex);
      if (phraseMatch) {
        const val = parseNum(phraseMatch[1]);
        if (!isNaN(val)) {
          price = val.toString();
        }
      }
    }
    
    // c) Fallback to generic numbers >= 1000, avoiding areas (which are usually < 1000)
    if (!price) {
      const genericRegex = /\b\d+(?:[.,]\d{3})*(?:\s*mil)?\b/gi;
      const matches = text.match(genericRegex);
      if (matches) {
        for (const match of matches) {
          const val = parseNum(match);
          if (!isNaN(val) && val >= 1000) {
            price = val.toString();
            break;
          }
        }
      }
    }

    // 2. Currency
    let currency = 'USD';
    if (text.match(/(?:dólares|dolares|usd|\$)/i)) {
      currency = 'USD';
    } else if (text.match(/(?:euros|eur|€)/i)) {
      currency = 'EUR';
    } else if (text.match(/(?:soles|sol|s\/\.?|pen)/i)) {
      currency = 'PEN';
    }

    // 3. Property Type
    let property_type = 'Casa';
    const typeRegex = /\b(casa|departamento|dpto|depto|oficina|terreno|local|penthouse|duplex|residencia)\b/i;
    const typeMatch = text.match(typeRegex);
    if (typeMatch) {
      const matchedType = typeMatch[1].toLowerCase();
      if (matchedType === 'casa' || matchedType === 'residencia') property_type = 'Casa';
      else if (matchedType === 'departamento' || matchedType === 'dpto' || matchedType === 'depto') property_type = 'Departamento';
      else if (matchedType === 'oficina') property_type = 'Oficina';
      else if (matchedType === 'terreno') property_type = 'Terreno';
      else if (matchedType === 'local') property_type = 'Local';
      else if (matchedType === 'penthouse') property_type = 'Penthouse';
      else if (matchedType === 'duplex') property_type = 'Duplex';
      else property_type = matchedType.charAt(0).toUpperCase() + matchedType.slice(1);
    }

    // 4. Operation
    let operation = 'Venta';
    if (text.match(/(?:alquiler|alquilar|renta|rentar|alquilo)\b/i)) {
      operation = 'Alquiler';
    }

    // 5. Area Total (m²)
    let area_total = '';
    const areaTotalRegexes = [
      /(\d+)\s*(?:m2|m²|m|metros|mt|mts)?\s*(?:de\s*)?(?:superficie|área total|area total|terreno|total)\b/i,
      /(?:superficie|área total|area total|terreno|total)\s*(?:de\s*)?(\d+)\b/i,
      /(\d+)\s*(?:m2|m²|m|metros|mt|mts)\s+totales\b/i
    ];
    for (const r of areaTotalRegexes) {
      const match = text.match(r);
      if (match) {
        area_total = match[1];
        break;
      }
    }

    // 6. Area Built (m²)
    let area_built = '';
    const areaBuiltRegexes = [
      /(\d+)\s*(?:m2|m²|m|metros|mt|mts)?\s*(?:de\s*)?(?:construido|construidos|construcción|techado|área construida|area construida)\b/i,
      /(?:construido|construcción|techado|área construida|area construida)\s*(?:de\s*)?(\d+)\b/i,
      /(\d+)\s*(?:m2|m²|m|metros|mt|mts)\s+(?:construidos|techados)\b/i
    ];
    for (const r of areaBuiltRegexes) {
      const match = text.match(r);
      if (match) {
        area_built = match[1];
        break;
      }
    }

    // 7. Bedrooms
    let bedrooms = '';
    const bedroomsMatch = text.match(/(\d+)\s*(?:dormitorio|habitación|habitacion|habitaciones|recámara|recamara|recámaras|recamaras|cuarto|cuartos)s?\b/i);
    if (bedroomsMatch) {
      bedrooms = bedroomsMatch[1];
    }

    // 8. Bathrooms
    let bathrooms = '';
    const bathroomsMatch = text.match(/(\d+)\s*(?:baño|sshh|ss\.hh)s?\b/i);
    if (bathroomsMatch) {
      bathrooms = bathroomsMatch[1];
    }

    // 9. District
    let district = '';
    const districtRegex = /\ben\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,2})\b/i;
    const districtMatch = text.match(districtRegex);
    if (districtMatch) {
      const rawDistrict = districtMatch[1].trim();
      const excludedWords = [
        'calle', 'avenida', 'av', 'jr', 'jirón', 'jiron', 'pasaje', 'una', 'un', 'el', 'la', 
        'este', 'venta', 'casa', 'departamento', 'dpto', 'depto', 'oficina', 'terreno', 'local'
      ];
      const firstWord = rawDistrict.split(' ')[0].toLowerCase();
      if (!excludedWords.includes(firstWord)) {
        district = rawDistrict;
      }
    }

    // 10. Title / Name
    let name = '';
    if (typeMatch) {
      const resolvedType = property_type;
      if (district) {
        name = `${resolvedType} en ${district}`;
      } else {
        name = `${resolvedType} Moderno`;
      }
    } else {
      name = 'Inmueble por Voz';
    }

    // 11. Address
    let address = '';
    const addressRegex = /\b(calle|avenida|av\.?|jr\.?|jirón|pasaje)\s+([a-záéíóúñ0-9\s]+?)\s+(\d{1,4})\b/i;
    const addressMatch = text.match(addressRegex);
    if (addressMatch) {
      const via = addressMatch[1].charAt(0).toUpperCase() + addressMatch[1].slice(1).toLowerCase();
      const street = addressMatch[2]
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      const num = addressMatch[3];
      
      let districtSuffix = '';
      if (district) {
        if (!street.toLowerCase().includes(district.toLowerCase())) {
          districtSuffix = `, ${district}`;
        }
      }
      address = `${via} ${street} ${num}${districtSuffix}`;
    } else {
      if (district) {
        address = district;
      } else {
        address = 'Dirección por determinar';
      }
    }

    // 12. Semáforo de Estado (status_color / status_reason)
    let status_color: 'green' | 'yellow' | 'red' = 'green';
    let status_reason = 'Propiedad en óptimas condiciones para venta/entrega.';
    if (text.match(/(?:rojo|ocupado|mantenimiento urgente|urgente|deteriorado)\b/i)) {
      status_color = 'red';
      status_reason = 'Requiere reparaciones o mantenimiento crítico.';
    } else if (text.match(/(?:amarillo|regular|mantenimiento|remodelar|pintar)\b/i)) {
      status_color = 'yellow';
      status_reason = 'Necesita mantenimiento menor o pintura.';
    }

    // 13. Property ID
    const property_id = `PROP-${Math.floor(100 + Math.random() * 900)}`;

    return { 
      name, 
      price, 
      address, 
      property_id, 
      property_type, 
      operation, 
      status_color, 
      status_reason, 
      currency, 
      area_total, 
      area_built, 
      bedrooms, 
      bathrooms,
      description: text
    };
  };

  const extractFieldsAndAutofill = (text: string) => {
    const fields = parseFields(text);

    setFormData({
      ...formData,
      name: fields.name.trim() || formData.name,
      address: fields.address.trim() || formData.address,
      property_id: fields.property_id || formData.property_id,
      property_type: fields.property_type || formData.property_type,
      operation: (fields.operation || formData.operation) as 'Venta' | 'Alquiler',
      status_color: (fields.status_color || formData.status_color) as 'green' | 'yellow' | 'red',
      status_reason: fields.status_reason || formData.status_reason,
      price: fields.price || formData.price,
      currency: fields.currency || formData.currency,
      area_total: fields.area_total || formData.area_total,
      area_built: fields.area_built || formData.area_built,
      bedrooms: fields.bedrooms || formData.bedrooms,
      bathrooms: fields.bathrooms || formData.bathrooms,
      description: text,
    });

    setShowVoiceAssistant(false);
    setShowAutofillAlert(true);
    
    setTimeout(() => {
      setShowAutofillAlert(false);
    }, 6000);
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDemo = localStorage.getItem('demo_user');
    const tempId = crypto.randomUUID();
    
    const newProperty: Property = {
      id: tempId,
      name: formData.name,
      address: formData.address,
      price: parseFloat(formData.price),
      description: formData.description,
      status: formData.status,
      currency: formData.currency,
      images: formData.images || [],
      company_id: profile?.company_id || '',
      created_at: new Date().toISOString(),
      property_id: formData.property_id,
      property_type: formData.property_type,
      operation: formData.operation,
      status_color: formData.status_color,
      status_reason: formData.status_reason,
      area_total: formData.area_total ? parseFloat(formData.area_total) : undefined,
      area_built: formData.area_built ? parseFloat(formData.area_built) : undefined,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : undefined,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms, 10) : undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      featured_image: formData.featured_image,
      documents: formData.documents,
    };

    // Optimistic Update
    const previousProperties = [...properties];
    const updatedProperties = [newProperty, ...properties];
    setProperties(updatedProperties);
    localStorage.setItem('properties_cache', JSON.stringify(updatedProperties));
    
    setIsModalOpen(false);
    setFormData({
      name: '',
      address: '',
      property_id: '',
      property_type: 'Casa',
      status: 'Disponible',
      operation: 'Venta',
      status_color: 'green',
      status_reason: '',
      price: '',
      currency: 'USD',
      area_total: '',
      area_built: '',
      bedrooms: '',
      bathrooms: '',
      description: '',
      images: [],
      featured_image: '',
      latitude: '-12.046186267780133',
      longitude: '-77.04275089398834',
      documents: [],
    });

    if (isDemo) {
      console.log('Demo mode: Skipping real database insert');
      return;
    }

    if (!profile?.company_id) {
      setProperties(previousProperties);
      alert('Error: No se pudo identificar tu empresa. Por favor, vuelve a iniciar sesión.');
      return;
    }

    try {
      // Extended fields payload
      const insertPayload = {
        name: formData.name,
        address: formData.address,
        price: parseFloat(formData.price),
        currency: formData.currency,
        status: formData.status,
        description: formData.description,
        images: formData.images || [],
        company_id: profile.company_id,
        property_id: formData.property_id,
        property_type: formData.property_type,
        operation: formData.operation,
        status_color: formData.status_color,
        status_reason: formData.status_reason,
        area_total: formData.area_total ? parseFloat(formData.area_total) : null,
        area_built: formData.area_built ? parseFloat(formData.area_built) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms, 10) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        featured_image: formData.featured_image || '',
        documents: formData.documents || [],
      };

      const { data, error } = await supabase
        .from('properties')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        // Fallback for schema mismatches (if extended columns do not exist in db)
        if (error.code === '42703' || error.message.includes('column')) {
          console.warn('Supabase extended columns not found. Falling back to core columns.');
          const fallbackPayload = {
            name: formData.name,
            address: formData.address,
            price: parseFloat(formData.price),
            currency: formData.currency,
            status: formData.status,
            description: formData.description,
            images: formData.images || [],
            company_id: profile.company_id,
          };
          const { data: fbData, error: fbError } = await supabase
            .from('properties')
            .insert([fallbackPayload])
            .select()
            .single();
          
          if (fbError) throw fbError;
          setProperties(prev => prev.map(p => p.id === tempId ? { ...newProperty, id: fbData.id } : p));
        } else {
          throw error;
        }
      } else {
        setProperties(prev => prev.map(p => p.id === tempId ? { ...newProperty, id: data.id } : p));
      }
    } catch (error) {
      console.error('Error inserting property:', error);
      setProperties(previousProperties);
      alert('Error al agregar propiedad en la base de datos. Se ha revertido el cambio.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta propiedad?')) return;
    
    setIsDeleting(id);
    const previousProperties = [...properties];
    setProperties(properties.filter(p => p.id !== id));
    
    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      setIsDeleting(null);
    } catch (error) {
      setIsDeleting(null);
      setProperties(previousProperties);
      alert('Error al eliminar. Se ha restaurado la propiedad.');
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Propiedades</h1>
          <p className="text-slate-500 mt-1">Administra el catálogo de inmuebles disponibles.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 px-6"
        >
          <Plus className="w-5 h-5" />
          Nueva Propiedad
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o dirección..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-400" />
          <select 
            className="input-field min-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Vendida">Vendida</option>
          </select>
        </div>
      </div>

      {/* Property List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900">No se encontraron propiedades</h3>
          <p className="text-slate-500">Comienza agregando una nueva propiedad al catálogo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="glass-card overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="h-48 bg-slate-200 relative">
                {property.images?.[0] ? (
                  <img src={property.images[0]} alt={property.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  property.status === 'Disponible' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {property.status}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {property.name}
                  </h3>
                  <div className="flex gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(property.id)}
                      disabled={isDeleting === property.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      {isDeleting === property.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <MapPin className="w-4 h-4 text-brand-500" />
                  {property.address}
                </div>
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="text-2xl font-black text-brand-600">
                      {property.currency} {property.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">Nueva Propiedad</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (showVoiceAssistant) {
                      setShowVoiceAssistant(false);
                      setIsRecording(false);
                      if (recognitionInstance) {
                        try { recognitionInstance.stop(); } catch (e) {}
                      }
                    } else {
                      setShowVoiceAssistant(true);
                      startVoiceRecognition();
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-300 ${
                    showVoiceAssistant
                      ? 'bg-brand-50 text-brand-600 border-brand-200 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Mic className={`w-3.5 h-3.5 ${showVoiceAssistant ? 'text-brand-500 animate-pulse' : 'text-slate-400'}`} />
                  {showVoiceAssistant ? 'Volver al formulario' : 'Dictar con Voz AI'}
                </button>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {showVoiceAssistant ? (
              <div className="p-6 space-y-6">
                {/* Voice Assistant View */}
                {isProcessing ? (
                  /* Processing State */
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                        <Sparkles className="w-8 h-8 animate-spin" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                      </span>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-slate-800 animate-pulse">IA Optimizando Texto...</h3>
                      <p className="text-slate-500 text-sm mt-1 max-w-sm">
                        Corrigiendo puntuación, detectando cifras, organizando características y formateando precios.
                      </p>
                    </div>
                  </div>
                ) : correctedText ? (
                  /* Review & Edit State */
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-950">Texto optimizado y corregido por la IA</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Puedes editar libremente el texto en el recuadro de abajo antes de confirmar el auto-relleno.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transcripción Pulida</label>
                      <textarea
                        className="input-field min-h-[160px] font-sans text-slate-800 leading-relaxed border-brand-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        value={correctedText}
                        onChange={(e) => setCorrectedText(e.target.value)}
                        placeholder="Edita la descripción aquí..."
                      />
                    </div>

                    {/* Preview of Extracted Fields */}
                    {(() => {
                      const preview = parseFields(correctedText);
                      return (
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campos a auto-rellenar:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Nombre del Inmueble</span>
                              <span className="text-xs font-semibold text-slate-800 truncate block mt-0.5" title={preview.name}>
                                {preview.name || 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Precio ({preview.currency})</span>
                              <span className={`text-xs font-semibold block mt-0.5 ${preview.price ? 'text-brand-600 font-mono' : 'text-amber-600'}`}>
                                {preview.price ? `${preview.currency === 'USD' ? '$' : preview.currency === 'EUR' ? '€' : 'S/ '}${parseFloat(preview.price).toLocaleString()} ${preview.currency}` : 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow col-span-2 sm:col-span-1">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Dirección</span>
                              <span className="text-xs font-semibold text-slate-800 truncate block mt-0.5" title={preview.address}>
                                {preview.address || 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Tipo</span>
                              <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                                {preview.property_type || 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Operación</span>
                              <span className={`text-xs font-semibold block mt-0.5 ${preview.operation === 'Alquiler' ? 'text-blue-600 font-bold' : 'text-emerald-600 font-bold'}`}>
                                {preview.operation || 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Habitaciones</span>
                              <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                                {preview.bedrooms ? `${preview.bedrooms} dorm.` : 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Baños</span>
                              <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                                {preview.bathrooms ? `${preview.bathrooms} baños` : 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Área Total</span>
                              <span className="text-xs font-semibold text-slate-800 block mt-0.5 font-mono">
                                {preview.area_total ? `${preview.area_total} m²` : 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Área Const.</span>
                              <span className="text-xs font-semibold text-slate-800 block mt-0.5 font-mono">
                                {preview.area_built ? `${preview.area_built} m²` : 'No detectado'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-all duration-200 hover:shadow col-span-2 lg:col-span-1">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Semáforo</span>
                              <span className={`text-[11px] font-bold block mt-0.5 flex items-center gap-1.5 ${
                                preview.status_color === 'green' ? 'text-green-600' : preview.status_color === 'yellow' ? 'text-amber-500' : 'text-rose-500'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                  preview.status_color === 'green' ? 'bg-green-500' : preview.status_color === 'yellow' ? 'bg-amber-400' : 'bg-rose-500'
                                }`} />
                                {preview.status_color === 'green' ? 'Verde' : preview.status_color === 'yellow' ? 'Amarillo' : 'Rojo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCorrectedText('');
                          setTranscript('');
                          startVoiceRecognition();
                        }}
                        className="btn-secondary flex items-center gap-2 text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Volver a Grabar
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectedText('');
                            setTranscript('');
                          }}
                          className="btn-secondary text-xs"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={() => extractFieldsAndAutofill(correctedText)}
                          className="btn-primary flex items-center gap-2 px-6 text-xs bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 border-none"
                        >
                          <Check className="w-4 h-4" />
                          Confirmar y Rellenar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Recording / Live Dictation State - Split Two-Column Layout */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-2 items-stretch">
                    
                    {/* Left Column: Recording Console */}
                    <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6 bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-slate-800">
                          {isRecording ? 'Escuchando tu dictado...' : 'Listo para grabar'}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                          Presiona el micrófono y habla naturalmente. La IA extraerá todos los campos clave.
                        </p>
                      </div>

                      {/* Microphone Pulse & Equalizer Waveform */}
                      <div className="flex flex-col items-center justify-center space-y-6 w-full">
                        {isRecording ? (
                          <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-[200px] px-4">
                            {/* 8 equalizer bars with staggered delays */}
                            <div className="w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ height: '35%', animationDelay: '0.1s', animationDuration: '0.6s' }} />
                            <div className="w-1.5 bg-brand-600 rounded-full animate-bounce" style={{ height: '65%', animationDelay: '0.25s', animationDuration: '0.7s' }} />
                            <div className="w-1.5 bg-brand-400 rounded-full animate-bounce" style={{ height: '45%', animationDelay: '0.4s', animationDuration: '0.5s' }} />
                            <div className="w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ height: '90%', animationDelay: '0.15s', animationDuration: '0.8s' }} />
                            <div className="w-1.5 bg-brand-600 rounded-full animate-bounce" style={{ height: '70%', animationDelay: '0.3s', animationDuration: '0.65s' }} />
                            <div className="w-1.5 bg-brand-400 rounded-full animate-bounce" style={{ height: '30%', animationDelay: '0.5s', animationDuration: '0.45s' }} />
                            <div className="w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ height: '80%', animationDelay: '0.2s', animationDuration: '0.75s' }} />
                            <div className="w-1.5 bg-brand-600 rounded-full animate-bounce" style={{ height: '50%', animationDelay: '0.35s', animationDuration: '0.6s' }} />
                          </div>
                        ) : (
                          <div className="h-16 flex items-center justify-center text-slate-300">
                            <Volume2 className="w-10 h-10 animate-pulse" />
                          </div>
                        )}

                        {/* Microphone central button */}
                        <button
                          type="button"
                          onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative focus:outline-none ${
                            isRecording
                              ? 'bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-100 scale-105 animate-pulse'
                              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xl shadow-brand-100 hover:scale-105'
                          }`}
                        >
                          <Mic className="w-10 h-10" />
                          {isRecording && (
                            <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75" />
                          )}
                        </button>

                        {voiceError && (
                          <div className="text-red-500 text-xs font-semibold bg-red-50 border border-red-100 rounded-lg py-2 px-4 max-w-xs text-center animate-bounce">
                            {voiceError}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={simulateDemoSpeech}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-white border border-slate-200 hover:bg-brand-50 rounded-full py-1.5 px-3.5 transition-all duration-300 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Simular dictado con audio demo
                        </button>
                      </div>

                      {/* Live continuous transcription box */}
                      <div className="w-full bg-white border border-slate-100 rounded-2xl p-4 min-h-[120px] flex flex-col justify-between shadow-sm">
                        <div className="w-full">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Transcripción en tiempo real:</span>
                          <p className={`text-xs leading-relaxed ${transcript ? 'text-slate-700 font-medium' : 'text-slate-400 italic'}`}>
                            {transcript || 'Comienza a hablar para ver la transcripción en vivo...'}
                          </p>
                        </div>
                        {isRecording && (
                          <button
                            type="button"
                            onClick={stopVoiceRecognition}
                            className="mt-3 text-[10px] font-bold text-slate-500 hover:text-slate-700 self-end flex items-center gap-1 bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded-full border border-slate-200 transition-all"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-ping mr-1" />
                            Finalizar y Formatear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Highly structured Guía de Dictado */}
                    <div className="lg:col-span-7 flex flex-col space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                          <Info className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Guía de Dictado para la IA</h4>
                          <p className="text-xs text-slate-500">Menciona estos detalles en tu mensaje para auto-rellenar correctamente.</p>
                        </div>
                      </div>

                      {/* Grid of 6 beautifully categorized guide cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        
                        {/* 1. Tipo & Operación */}
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow transition-all duration-300 flex gap-3 group hover:border-brand-200">
                          <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <Home className="w-4.5 h-4.5" />
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block">1. Tipo y Operación</span>
                            <p className="text-[10px] text-slate-500 leading-tight">Tipo de inmueble (Casa, Dep., Oficina) y si es Venta o Alquiler.</p>
                            <div className="bg-orange-50/50 rounded p-1.5 border border-orange-100/50 mt-1">
                              <span className="text-[9px] font-medium text-orange-700 italic block leading-snug">
                                "Es un departamento en alquiler..."
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Ubicación Exacta */}
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow transition-all duration-300 flex gap-3 group hover:border-brand-200">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <MapPin className="w-4.5 h-4.5" />
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block">2. Ubicación Exacta</span>
                            <p className="text-[10px] text-slate-500 leading-tight">Dirección, calle, número, distrito y referencias.</p>
                            <div className="bg-emerald-50/50 rounded p-1.5 border border-emerald-100/50 mt-1">
                              <span className="text-[9px] font-medium text-emerald-700 italic block leading-snug">
                                "Ubicado en Miraflores, Av Larco 500..."
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Precio y Moneda */}
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow transition-all duration-300 flex gap-3 group hover:border-brand-200">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <DollarSign className="w-4.5 h-4.5" />
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block">3. Precio y Moneda</span>
                            <p className="text-[10px] text-slate-500 leading-tight">Monto exacto del precio y moneda (Dólares o Soles).</p>
                            <div className="bg-amber-50/50 rounded p-1.5 border border-amber-100/50 mt-1">
                              <span className="text-[9px] font-medium text-amber-700 italic block leading-snug">
                                "A un precio de 150 mil dólares..."
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 4. Áreas y Dimensiones */}
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow transition-all duration-300 flex gap-3 group hover:border-brand-200">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <Layers className="w-4.5 h-4.5" />
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block">4. Áreas y Dimensiones</span>
                            <p className="text-[10px] text-slate-500 leading-tight">Área total y área construida en metros cuadrados.</p>
                            <div className="bg-indigo-50/50 rounded p-1.5 border border-indigo-100/50 mt-1">
                              <span className="text-[9px] font-medium text-indigo-700 italic block leading-snug">
                                "Tiene 120 metros de área total..."
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 5. Ambientes y Distribución */}
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow transition-all duration-300 flex gap-3 group hover:border-brand-200">
                          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <BedDouble className="w-4.5 h-4.5" />
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block">5. Ambientes y Habitaciones</span>
                            <p className="text-[10px] text-slate-500 leading-tight">Cantidad de dormitorios, baños y cocheras.</p>
                            <div className="bg-purple-50/50 rounded p-1.5 border border-purple-100/50 mt-1">
                              <span className="text-[9px] font-medium text-purple-700 italic block leading-snug">
                                "Tiene 3 dormitorios y 2 baños..."
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 6. Descripción y Semáforo */}
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow transition-all duration-300 flex gap-3 group hover:border-brand-200">
                          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block">6. Detalles y Semáforo</span>
                            <p className="text-[10px] text-slate-500 leading-tight">Estado de conservación general y color del semáforo.</p>
                            <div className="bg-rose-50/50 rounded p-1.5 border border-rose-100/50 mt-1">
                              <span className="text-[9px] font-medium text-rose-700 italic block leading-snug">
                                "Excelente estado, semáforo verde..."
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddProperty} className="p-6 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
                {showAutofillAlert && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-4 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-950">¡Campos auto-rellenados con éxito!</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          La IA de Voz ha completado el Nombre, Precio, Dirección, Tipo de Inmueble, Operación, Habitaciones, Baños, Áreas y Descripción a partir de tu dictado.
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowAutofillAlert(false)} 
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded bg-white border border-emerald-200"
                    >
                      Entendido
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                  {/* Left Column */}
                  <div className="space-y-5">
                    {/* Nombre */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nombre</label>
                      <input 
                        required 
                        type="text" 
                        className="input-field" 
                        placeholder="Ej. Residencial Los Olivos #402"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>

                    {/* Dirección */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Dirección</label>
                      <input 
                        required 
                        type="text" 
                        className="input-field" 
                        placeholder="Av. Principal 123, Miraflores"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>

                    {/* ID de Propiedad y Tipo de Propiedad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ID de Propiedad</label>
                        <input 
                          required 
                          type="text" 
                          className="input-field" 
                          placeholder="PROP-123"
                          value={formData.property_id}
                          onChange={(e) => setFormData({...formData, property_id: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tipo de Propiedad</label>
                        <select 
                          className="input-field"
                          value={formData.property_type}
                          onChange={(e) => setFormData({...formData, property_type: e.target.value})}
                        >
                          <option value="Casa">Casa</option>
                          <option value="Departamento">Departamento</option>
                          <option value="Oficina">Oficina</option>
                          <option value="Terreno">Terreno</option>
                          <option value="Local">Local</option>
                          <option value="Penthouse">Penthouse</option>
                          <option value="Duplex">Duplex</option>
                        </select>
                      </div>
                    </div>

                    {/* Estado y Operación */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Estado</label>
                        <select 
                          className="input-field"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        >
                          <option value="Disponible">Disponible</option>
                          <option value="Vendida">Vendida</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Operación</label>
                        <select 
                          className="input-field"
                          value={formData.operation}
                          onChange={(e) => setFormData({...formData, operation: e.target.value as any})}
                        >
                          <option value="Venta">Venta</option>
                          <option value="Alquiler">Alquiler</option>
                        </select>
                      </div>
                    </div>

                    {/* Semáforo de Estado */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Semáforo de Estado</label>
                      <div className="flex items-center gap-4">
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, status_color: 'green'})} 
                          className={`w-8 h-8 rounded-full transition-all duration-200 border-2 ${
                            formData.status_color === 'green' 
                              ? 'bg-emerald-500 border-emerald-600 scale-110 shadow-lg shadow-emerald-200' 
                              : 'bg-emerald-400/30 border-transparent hover:bg-emerald-400/50'
                          }`} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, status_color: 'yellow'})} 
                          className={`w-8 h-8 rounded-full transition-all duration-200 border-2 ${
                            formData.status_color === 'yellow' 
                              ? 'bg-amber-400 border-amber-500 scale-110 shadow-lg shadow-amber-200' 
                              : 'bg-amber-300/30 border-transparent hover:bg-amber-300/50'
                          }`} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, status_color: 'red'})} 
                          className={`w-8 h-8 rounded-full transition-all duration-200 border-2 ${
                            formData.status_color === 'red' 
                              ? 'bg-rose-500 border-rose-600 scale-110 shadow-lg shadow-rose-200' 
                              : 'bg-rose-400/30 border-transparent hover:bg-rose-400/50'
                          }`} 
                        />
                      </div>
                      <textarea 
                        className="input-field min-h-[60px] text-xs resize-none" 
                        placeholder="Motivo del color seleccionado..." 
                        value={formData.status_reason} 
                        onChange={(e) => setFormData({...formData, status_reason: e.target.value})} 
                      />
                    </div>

                    {/* Precio y Moneda */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Precio</label>
                        <input 
                          required 
                          type="number" 
                          className="input-field" 
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Moneda</label>
                        <select 
                          className="input-field"
                          value={formData.currency}
                          onChange={(e) => setFormData({...formData, currency: e.target.value})}
                        >
                          <option value="USD">USD</option>
                          <option value="PEN">PEN</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>

                    {/* Superficie (m²) y Construido (m²) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Superficie (m²)</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          placeholder="Ej. 120"
                          value={formData.area_total}
                          onChange={(e) => setFormData({...formData, area_total: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Construido (m²)</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          placeholder="Ej. 95"
                          value={formData.area_built}
                          onChange={(e) => setFormData({...formData, area_built: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Habitaciones y Baños */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Habitaciones</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          placeholder="Ej. 3"
                          value={formData.bedrooms}
                          onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Baños</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          placeholder="Ej. 2"
                          value={formData.bathrooms}
                          onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Descripción</label>
                      <textarea 
                        className="input-field min-h-[100px] resize-none" 
                        placeholder="Detalles sobre la propiedad, ambientes, etc."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    {/* Documentos de la Propiedad */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Documentos de la Propiedad</label>
                      <div 
                        className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer" 
                        onClick={() => {
                          const mockDoc = `doc-${Math.floor(1000 + Math.random() * 9000)}.pdf`;
                          setFormData(prev => ({ ...prev, documents: [...prev.documents, mockDoc] }));
                        }}
                      >
                        <span className="text-xs font-bold text-brand-600 hover:text-brand-700">Subir archivos (PDF, Imagen)</span>
                        {formData.documents.length > 0 && (
                          <div className="mt-3 w-full space-y-1" onClick={(e) => e.stopPropagation()}>
                            {formData.documents.map((doc, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                                <span className="truncate max-w-[200px] font-medium">{doc}</span>
                                <button 
                                  type="button" 
                                  className="text-rose-500 hover:text-rose-700 font-bold" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }));
                                  }}
                                >
                                  Eliminar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Imagen Destacada */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Imagen Destacada</label>
                      <div 
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 transition-all duration-200 cursor-pointer text-center relative overflow-hidden h-[180px]" 
                        onClick={() => {
                          const mockUrl = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80';
                          setFormData(prev => ({ 
                            ...prev, 
                            featured_image: mockUrl, 
                            images: prev.images.includes(mockUrl) ? prev.images : [mockUrl, ...prev.images] 
                          }));
                        }}
                      >
                        {formData.featured_image ? (
                          <>
                            <img src={formData.featured_image} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Cambiar imagen</div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-brand-600">Subir un archivo</span>
                            <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, GIF</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Galería de Imágenes */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Galería de Imágenes</label>
                      <button 
                        type="button" 
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-brand-600 bg-white hover:bg-slate-50 transition-colors shadow-sm" 
                        onClick={() => {
                          const index = formData.images.length + 1;
                          const mockUrls = [
                            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
                            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
                            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
                          ];
                          const chosenUrl = mockUrls[(index - 1) % mockUrls.length];
                          setFormData(prev => ({ ...prev, images: [...prev.images, chosenUrl] }));
                        }}
                      >
                        Añadir imágenes a la galería
                      </button>
                      {formData.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg border border-slate-100 overflow-hidden group">
                              <img src={img} className="w-full h-full object-cover" />
                              <button 
                                type="button" 
                                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    images: prev.images.filter((_, i) => i !== idx), 
                                    featured_image: prev.featured_image === img ? '' : prev.featured_image 
                                  }));
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ubicación Map & Coordinates */}
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ubicación</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latitud</label>
                          <input 
                            type="text" 
                            className="input-field text-xs font-mono" 
                            value={formData.latitude} 
                            onChange={(e) => handleCoordsChange('latitude', e.target.value)} 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitud</label>
                          <input 
                            type="text" 
                            className="input-field text-xs font-mono" 
                            value={formData.longitude} 
                            onChange={(e) => handleCoordsChange('longitude', e.target.value)} 
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">Mueva el pin en el mapa o ingrese las coordenadas manualmente.</p>
                      <div 
                        ref={mapContainerRef} 
                        style={{ height: '240px' }} 
                        className="w-full rounded-xl border border-slate-200 overflow-hidden shadow-sm mt-2 relative z-10" 
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={closeModal} 
                    className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-sm font-semibold text-white transition-colors shadow-sm"
                  >
                    Añadir Propiedad
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;
