import { useCallback, useState } from 'react'

// Genişliği eleman bağlandığı anda ölçer, sonra boyut değişikliklerini izler.
function useWidth() {
  const [width, setWidth] = useState(0)
  const ref = useCallback((el) => {
    if (!el) return
    setWidth(Math.floor(el.getBoundingClientRect().width))
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// Okunaklı eksen değerleri: 0 / 5 / 10 gibi yuvarlak adımlar
function niceTicks(min, max, count = 4) {
  if (min === max) {
    min -= 1
    max += 1
  }
  const raw = (max - min) / (count - 1)
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const out = []
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1000) / 1000)
  return out
}

// Üstü 4px yuvarlatılmış, tabanı düz sütun
function barPath(x, base, w, h) {
  const r = Math.min(4, h, w / 2)
  return `M${x},${base}V${base - h + r}Q${x},${base - h} ${x + r},${base - h}H${x + w - r}Q${x + w},${base - h} ${x + w},${base - h + r}V${base}Z`
}

function Tooltip({ x, y, width, children }) {
  const left = Math.min(Math.max(x, 70), width - 70)
  return (
    <div className="chart-tip" style={{ left, top: y }}>
      {children}
    </div>
  )
}

export function ColumnChart({ data, height = 190, formatTick = (v) => v, renderTip }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const pad = { top: 14, right: 4, bottom: 24, left: 30 }
  const yTicks = niceTicks(0, Math.max(1, ...data.map((d) => d.value)), 3)
  const top = yTicks[yTicks.length - 1]
  const iw = Math.max(0, width - pad.left - pad.right)
  const ih = height - pad.top - pad.bottom
  const slot = data.length ? iw / data.length : 0
  const bw = Math.max(2, Math.min(24, slot - 2))
  const y = (v) => pad.top + ih - (v / top) * ih
  const labelEvery = Math.max(1, Math.ceil(data.length / 7))
  const active = hover !== null ? data[hover] : null

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {yTicks.map((t) => (
            <g key={t}>
              <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="chart-axis" x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {formatTick(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.left + slot * i + (slot - bw) / 2
            const h = (d.value / top) * ih
            return (
              <g key={d.key}>
                {d.value > 0 && (
                  <path
                    className={`chart-bar ${hover !== null && hover !== i ? 'dim' : ''}`}
                    d={barPath(x, pad.top + ih, bw, h)}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text className="chart-axis" x={x + bw / 2} y={height - 6} textAnchor="middle">
                    {d.label}
                  </text>
                )}
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={ih}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onClick={() => setHover(hover === i ? null : i)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {active && (
        <Tooltip x={pad.left + slot * hover + slot / 2} y={y(active.value) - 8} width={width}>
          {renderTip(active)}
        </Tooltip>
      )}
    </div>
  )
}

export function LineChart({ points, height = 200, format = (v) => v, renderTip }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const pad = { top: 26, right: 18, bottom: 24, left: 36 }
  const values = points.map((p) => p.value)
  const yTicks = niceTicks(Math.min(...values), Math.max(...values), 4)
  const lo = yTicks[0]
  const hi = yTicks[yTicks.length - 1]
  const iw = Math.max(0, width - pad.left - pad.right)
  const ih = height - pad.top - pad.bottom
  const t0 = points[0].date.getTime()
  const t1 = points[points.length - 1].date.getTime()
  const x = (d) => pad.left + (t1 === t0 ? iw / 2 : ((d.getTime() - t0) / (t1 - t0)) * iw)
  const y = (v) => pad.top + ih - ((v - lo) / (hi - lo)) * ih
  const xy = points.map((p) => [x(p.date), y(p.value)])
  const line = xy.map(([a, b], i) => `${i ? 'L' : 'M'}${a},${b}`).join('')
  const area = `${line}L${xy[xy.length - 1][0]},${pad.top + ih}L${xy[0][0]},${pad.top + ih}Z`
  const last = xy[xy.length - 1]

  function pick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0
    xy.forEach(([a], i) => {
      if (Math.abs(a - px) < Math.abs(xy[best][0] - px)) best = i
    })
    setHover(best)
  }

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="chart-axis" x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          {points.length > 1 && <path className="chart-area" d={area} />}
          {points.length > 1 && <path className="chart-line" d={line} />}
          {hover !== null && (
            <line className="chart-cross" x1={xy[hover][0]} x2={xy[hover][0]} y1={pad.top} y2={pad.top + ih} />
          )}
          {xy.map(([a, b], i) => (
            <circle key={i} className="chart-dot" cx={a} cy={b} r={hover === i ? 6 : 4} />
          ))}
          {hover === null && (
            <text className="chart-value" x={last[0]} y={last[1] - 12} textAnchor={points.length > 1 ? 'end' : 'middle'}>
              {format(points[points.length - 1].value)}
            </text>
          )}
          <text className="chart-axis" x={xy[0][0]} y={height - 6} textAnchor={points.length > 1 ? 'start' : 'middle'}>
            {points[0].label}
          </text>
          {points.length > 1 && (
            <text className="chart-axis" x={last[0]} y={height - 6} textAnchor="end">
              {points[points.length - 1].label}
            </text>
          )}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={xy[hover][0]} y={xy[hover][1] - 12} width={width}>
          {renderTip(points[hover])}
        </Tooltip>
      )}
    </div>
  )
}
