"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useAppStore } from "@/store/useAppStore";
import { useFilteredStores } from "@/lib/useFilteredStores";
import { STATUS_STYLES, STATUS_LABELS } from "@/lib/types";
import type { Store } from "@/lib/types";

const GREECE_CENTER: [number, number] = [38.9, 23.7];
const GREECE_DEFAULT_ZOOM = 6;

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

function FlyToSelected({ stores }: { stores: Store[] }) {
  const map = useMap();
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);

  useEffect(() => {
    if (!selectedStoreId) return;
    const store = stores.find((s) => s.id === selectedStoreId);
    if (store?.lat != null && store?.lng != null) {
      map.flyTo([store.lat, store.lng], Math.max(map.getZoom(), 12), {
        duration: 0.6,
      });
    }
  }, [selectedStoreId, stores, map]);

  return null;
}

export default function MapView({ visible = true }: { visible?: boolean }) {
  const filteredStores = useFilteredStores();
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);
  const selectStore = useAppStore((s) => s.selectStore);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const storesWithCoords = filteredStores.filter(
    (s) => s.lat != null && s.lng != null
  );

  useEffect(() => {
    if (selectedStoreId && markerRefs.current[selectedStoreId]) {
      markerRefs.current[selectedStoreId]?.openPopup();
    }
  }, [selectedStoreId]);

  return (
    <MapContainer
      center={GREECE_CENTER}
      zoom={GREECE_DEFAULT_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> συνεισφέροντες'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected stores={storesWithCoords} />
      <InvalidateSizeOnVisible visible={visible} />
      {storesWithCoords.map((store) => (
        <Marker
          key={store.id}
          position={[store.lat as number, store.lng as number]}
          icon={makeIcon(store.status, store.id === selectedStoreId)}
          ref={(ref) => {
            markerRefs.current[store.id] = ref;
          }}
          eventHandlers={{
            click: () => selectStore(store.id),
          }}
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
    </MapContainer>
  );
}
