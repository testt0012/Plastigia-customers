"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useAppStore } from "@/store/useAppStore";
import { useFilteredStores } from "@/lib/useFilteredStores";
import { STATUS_STYLES, STATUS_LABELS } from "@/lib/types";
import type { Store } from "@/lib/types";

const GREECE_CENTER: [number, number] = [38.9, 23.7];
const GREECE_DEFAULT_ZOOM = 6;
const GREECE_MIN_ZOOM = 6;
// Slightly wider than Greece's landmass so panning to the edges (Crete,
// the Ionian islands, Evros) still leaves some breathing room.
const GREECE_BOUNDS: L.LatLngBoundsExpression = [
  [34.0, 18.8],
  [42.2, 29.8],
];

function makeIcon(status: Store["status"], isSelected: boolean) {
  const color = STATUS_STYLES[status].pin;
  const size = isSelected ? 26 : 18;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${color};
      border:2px solid ${status === "not_client" ? "#525252" : "white"};
      box-shadow:0 1px 3px rgba(0,0,0,0.5);
      ${isSelected ? "outline:2px solid #171717;outline-offset:2px;" : ""}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Only 8 distinct icons ever exist (4 statuses x selected/unselected), so
// build them once and hand out the same instance every time instead of
// creating a fresh L.divIcon per marker on every render. Passing a stable
// icon reference lets react-leaflet skip its setIcon() DOM update for every
// marker whose selection state didn't actually change — without this, e.g.
// clicking one marker was touching all ~700 markers instead of just two.
const iconCache = new Map<string, L.DivIcon>();
function getIcon(status: Store["status"], isSelected: boolean) {
  const key = `${status}:${isSelected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = makeIcon(status, isSelected);
    iconCache.set(key, icon);
  }
  return icon;
}

// Leaflet computes its tile layout from the container's on-screen size at
// init time. On mobile the map starts out CSS-hidden (behind the list tab),
// so it initializes with a stale/zero size — this nudges it to recompute
// once the tab becomes visible again.
function InvalidateSizeOnVisible({ visible }: { visible: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [visible, map]);

  return null;
}

// Zooms the map to fit the currently filtered region whenever the region
// filter itself changes; resets to the whole-country view when it's
// cleared. Deliberately depends only on filterRegion (not the stores
// array) — selecting/deselecting a store on the map re-renders MapView
// with a fresh `storesWithCoords` array on every render, and if that array
// were a dependency here, opening or closing a store would keep re-firing
// this effect and flying the map back to the whole-country view instead of
// leaving it where the user had zoomed/panned it.
function FitToRegion({ stores }: { stores: Store[] }) {
  const map = useMap();
  const filterRegion = useAppStore((s) => s.filterRegion);
  const storesRef = useRef(stores);
  storesRef.current = stores;

  useEffect(() => {
    try {
      if (filterRegion === "all") {
        map.flyToBounds(GREECE_BOUNDS, { padding: [20, 20], duration: 0.6 });
        return;
      }
      const points = storesRef.current
        .map((s): [number, number] => [s.lat as number, s.lng as number])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
      if (points.length === 0) return;
      const bounds = L.latLngBounds(points);
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 12, duration: 0.6 });
    } catch (err) {
      // Never let a bad coordinate crash the whole map view.
      console.error("FitToRegion failed:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRegion, map]);

  return null;
}

export default function MapView({ visible = true }: { visible?: boolean }) {
  const filteredStores = useFilteredStores();
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);
  const selectStore = useAppStore((s) => s.selectStore);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  const storesWithCoords = useMemo(
    () => filteredStores.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)),
    [filteredStores]
  );

  // Keyed by store id and only rebuilt when the filtered list itself
  // changes (not on every selection change), so clicking a marker doesn't
  // make react-leaflet unbind/rebind click listeners on every other marker.
  const eventHandlersById = useMemo(() => {
    const map: Record<string, { click: () => void }> = {};
    for (const store of storesWithCoords) {
      map[store.id] = { click: () => selectStore(store.id) };
    }
    return map;
  }, [storesWithCoords, selectStore]);

  const setMarkerRef = useMemo(() => {
    const cache: Record<string, (ref: L.Marker | null) => void> = {};
    return (id: string) => {
      if (!cache[id]) {
        cache[id] = (ref) => {
          markerRefs.current[id] = ref;
        };
      }
      return cache[id];
    };
  }, []);

  // A selected marker may be hidden inside a collapsed cluster — a plain
  // marker.openPopup() wouldn't reveal it. zoomToShowLayer() zooms/pans just
  // enough to break the cluster open (or does nothing extra if the marker
  // is already visible) and only then is it safe to open its popup.
  useEffect(() => {
    if (!selectedStoreId) return;
    const marker = markerRefs.current[selectedStoreId];
    const group = clusterGroupRef.current;
    if (!marker) return;

    try {
      if (group) {
        group.zoomToShowLayer(marker, () => marker.openPopup());
      } else {
        marker.openPopup();
      }
    } catch (err) {
      // Never let a bad coordinate crash the whole map view.
      console.error("Failed to focus selected marker:", err);
    }
  }, [selectedStoreId]);

  return (
    <MapContainer
      center={GREECE_CENTER}
      zoom={GREECE_DEFAULT_ZOOM}
      minZoom={GREECE_MIN_ZOOM}
      maxBounds={GREECE_BOUNDS}
      maxBoundsViscosity={1.0}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> συνεισφέροντες'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSizeOnVisible visible={visible} />
      <FitToRegion stores={storesWithCoords} />
      <MarkerClusterGroup ref={clusterGroupRef} chunkedLoading maxClusterRadius={60}>
        {storesWithCoords.map((store) => (
          <Marker
            key={store.id}
            position={[store.lat as number, store.lng as number]}
            icon={getIcon(store.status, store.id === selectedStoreId)}
            ref={setMarkerRef(store.id)}
            eventHandlers={eventHandlersById[store.id]}
          >
            <Popup>
              <div className="min-w-[180px] text-sm">
                <p className="font-semibold">{store.name}</p>
                <p className="text-neutral-600">
                  {store.city} · {store.region}
                </p>
                <p className="mt-1 text-xs font-medium">
                  {STATUS_LABELS[store.status]}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
