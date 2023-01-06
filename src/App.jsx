import './App.css';
import { useState, useRef, useEffect } from 'react';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import * as ttapi from '@tomtom-international/web-sdk-services';
import tt from '@tomtom-international/web-sdk-maps';

function App() {
  const mapElement = useRef();

  const [mapLongitude, setMapLongitude] = useState(28.9784);
  const [mapLatitude, setMapLatitude] = useState(41.0082);
  const [map, setMap] = useState({});

  const converToPoints = (LngLat) => {
    return {
      point: {
        latitude: LngLat.lat,
        longitude: LngLat.lng,
      },
    };
  };

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route');
      map.removeSource('route');
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson,
      },
      paint: {
        'line-color': '#4a90e2',
        'line-width': 6,
      },
    });
  };

  const addDeliveryMarker = (lngLat, map, destinations) => {
    const element = document.createElement('div');
    element.className = 'bg-red-400 w-4 h-4 rounded-full';

    const p = document.createElement('p');
    p.textContent = `${destinations.length}`;
    p.className = 'text-white flex justify-center';
    element.appendChild(p);

    new tt.Marker({
      element: element,
    })
      .setLngLat(lngLat)
      .addTo(map);
  };

  useEffect(() => {
    const origin = {
      lng: mapLongitude,
      lat: mapLatitude,
    };

    const map = tt.map({
      key: process.env.REACT_APP_DISTANCE_KEY,
      container: mapElement.current,
      center: [mapLongitude, mapLatitude],
      zoom: 12,
      style: {
        map: 'basic_main-lite',
        trafficIncidents: 'incidents_day',
        trafficFlow: 'flow_absolute',
      },
    });
    setMap(map);

    const addMarker = () => {
      const popupOffSet = {
        bottom: [0, -35],
      };

      const popup = new tt.Popup({ offset: popupOffSet }).setHTML(
        'Your Location',
      );
      const marker = new tt.Marker({ draggable: true })
        .setLngLat([mapLongitude, mapLatitude])
        .addTo(map);

      marker.on('dragend', () => {
        const LngLat = marker.getLngLat();
        setMapLongitude(LngLat.lng);
        setMapLatitude(LngLat.lat);
      });
      marker.setPopup(popup).togglePopup();
    };

    addMarker();

    const sortDestinations = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return converToPoints(destination);
      });
      const callParameters = {
        key: process.env.REACT_APP_DISTANCE_KEY,
        destinations: pointsForDestinations,
        origins: [converToPoints(origin)],
      };
      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
          .then((matrixAPIResults) => {
            const results = matrixAPIResults.matrix[0];
            const resultsArray = results.map((result, index) => {
              return {
                location: locations[index],
                drivingTime: result.response.routeSummary.travelTimeInSeconds,
              };
            });
            resultsArray.sort((a, b) => {
              return a.drivingTime - b.drivingTime;
            });
            const sortedLocations = resultsArray.map((result) => {
              return result.location;
            });
            resolve(sortedLocations);
          });
      });
    };

    const recalcRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin);

        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_DISTANCE_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson();
            drawRoute(geoJson, map);
          });
      });
    };

    const destinations = [];
    map.on('click', (e) => {
      destinations.push(e.lngLat);
      addDeliveryMarker(e.lngLat, map, destinations);
      recalcRoutes();
    });
    console.log(destinations);
    return () => map.remove();
  }, [mapLatitude, mapLongitude]);

  return (
    <>
      {map && (
        <div className=' pt-5 bg-slate-400 h-screen'>
          <div
            ref={mapElement}
            className='container flex mx-auto  h-[600px] w-screen'
          />
          <div className='text-white font-serif text-3xl flex justify-center py-5 '>
            Click on the map for the route you want to follow
          </div>
        </div>
      )}
    </>
  );
}

export default App;
