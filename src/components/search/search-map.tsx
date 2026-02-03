"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { formatCurrency } from "@/lib/utils";
import type { DaycareSearchResult } from "@/server/actions/daycare";

interface SearchMapProps {
  daycares: DaycareSearchResult[];
  center?: [number, number];
  zoom?: number;
}

export function SearchMap({ daycares, center, zoom = 10 }: SearchMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  // Check token availability at render time to avoid setState in effect
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [mapError, setMapError] = useState<string | null>(
    !token ? "Mapbox token not configured" : null
  );

  // Calculate center from daycares if not provided
  const defaultCenter: [number, number] = center || (() => {
    if (daycares.length === 0) return [-98.5795, 39.8283]; // US center
    const lngs = daycares.map((d) => d.longitude);
    const lats = daycares.map((d) => d.latitude);
    return [
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
      lats.reduce((a, b) => a + b, 0) / lats.length,
    ];
  })();

  useEffect(() => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: defaultCenter,
        zoom: zoom,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Cleanup on unmount
      return () => {
        markersRef.current.forEach((marker) => marker.remove());
        map.current?.remove();
      };
    } catch {
      // Defer setState to avoid synchronous update in effect
      queueMicrotask(() => setMapError("Failed to initialize map"));
    }
  }, [defaultCenter, token, zoom]);

  // Update markers when daycares change
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    daycares.forEach((daycare) => {
      const el = document.createElement("div");
      el.className = "daycare-marker";
      el.innerHTML = `
        <div class="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm font-medium shadow-lg cursor-pointer hover:scale-110 transition-transform">
          ${daycare.consultationFee ? formatCurrency(Number(daycare.consultationFee)) : daycare.specialty || "Provider"}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm">${daycare.name}</h3>
          <p class="text-xs text-gray-600">${daycare.specialty || "General Practice"}</p>
          <p class="text-xs text-gray-500">${daycare.city}, ${daycare.state}</p>
          <div class="flex items-center gap-1 mt-1">
            <span class="text-yellow-500">★</span>
            <span class="text-xs">${daycare.rating?.toFixed(1) || "New"}</span>
            <span class="text-xs text-gray-400">(${daycare.reviewCount} reviews)</span>
          </div>
          <a href="/provider/${daycare.slug}" class="text-xs text-primary hover:underline mt-2 inline-block">
            View details →
          </a>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([daycare.longitude, daycare.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (daycares.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      daycares.forEach((d) => bounds.extend([d.longitude, d.latitude]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [daycares, token]);

  if (mapError) {
    return (
      <div className="h-[500px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{mapError}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please configure NEXT_PUBLIC_MAPBOX_TOKEN
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-[500px] rounded-lg" />
      <style jsx global>{`
        .mapboxgl-popup-content {
          border-radius: 8px;
          padding: 0;
        }
        .mapboxgl-popup-close-button {
          padding: 4px 8px;
        }
      `}</style>
    </div>
  );
}
