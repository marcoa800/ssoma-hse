import { useRef, useState, useEffect } from 'react';

// Envuelve una tabla ancha y le agrega una barra de scroll horizontal SUPERIOR
// sincronizada con la tabla, para poder desplazarse a los lados sin bajar hasta
// el fondo. Pensado para usarse DENTRO de un bloque `hidden md:block` (escritorio).
//
// Uso:
//   <div className="hidden md:block">
//     <WideTableScroll maxH="max-h-[calc(100vh-200px)]">
//       <table>...</table>
//     </WideTableScroll>
//   </div>
export function WideTableScroll({
  children,
  maxH = "max-h-[calc(100vh-220px)]",
  cardClass = "bg-gray-900 border border-gray-800 rounded-xl",
}) {
  const tableScrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableW, setTableW] = useState(0);
  const syncFrom = (src, dst) => { if (src.current && dst.current) dst.current.scrollLeft = src.current.scrollLeft; };

  // Mide el ancho real de la tabla en cada render (se estabiliza solo).
  useEffect(() => {
    const measure = () => { if (tableScrollRef.current) setTableW(tableScrollRef.current.scrollWidth); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });

  return (
    <>
      {/* Barra de scroll horizontal superior (sincronizada) */}
      <div ref={topScrollRef} onScroll={() => syncFrom(topScrollRef, tableScrollRef)}
        className="overflow-x-auto overflow-y-hidden mb-1.5" style={{ height: 12 }}>
        <div style={{ width: tableW, height: 1 }} />
      </div>
      <div className={`overflow-hidden ${cardClass}`}>
        <div ref={tableScrollRef} onScroll={() => syncFrom(tableScrollRef, topScrollRef)}
          className={`overflow-x-auto overflow-y-auto ${maxH}`}>
          {children}
        </div>
      </div>
    </>
  );
}
