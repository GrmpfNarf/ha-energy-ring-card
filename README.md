# Energy Ring Card

Lovelace-Karte für Home Assistant, die den Energiefluss im Haus als Kreise zeigt.

- **Radiale Ansicht** (mit `house:`): Haus in der Mitte, Räume im Kreis, Geräte um jeden Raum. Blasen laufen Gerät → Raum → Haus.
- **Raster-Ansicht** (ohne `house:`): Räume als Kacheln, `columns` steuert die Anzahl.

Leistung wird in W/kW angezeigt, Tagesverbrauch aus der Recorder-Statistik (ab lokaler Mitternacht, oder `kwh_window: 24h`). Andere Einheiten (z. B. Gas in m³) bleiben wie sie sind.

## Installation über HACS

1. HACS → Frontend → Menü (⋮) → **Benutzerdefinierte Repositories**.
2. URL `https://github.com/GrmpfNarf/ha-energy-ring-card`, Kategorie **Dashboard**.
3. Installieren, danach Home Assistant neu laden bzw. den Browser-Cache leeren.

## Beispiel

```yaml
type: custom:energy-ring-card
title: Energie im Haus
house:
  name: Haus
  kwh_entity: sensor.<gesamtzaehler>
rooms:
  - title: Wohnzimmer
    icon: mdi:sofa
    devices:
      - entity: sensor.<leistung>
        kwh_entity: sensor.<energie>
        name: Deckenlicht
        icon: mdi:ceiling-light
```

## Lizenz

MIT, siehe [LICENSE](LICENSE).
