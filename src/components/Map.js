import React, { useEffect, useState, useRef } from 'react';
import { Loader, Marker } from '@googlemaps/js-api-loader';

const routerLength = 1

const Map = ({ routeMarkers, wayPoints, debugMode, clearMap, hoverMarker }) => {
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);

  const [debugMarkersObjs, setDebugMarkersObjs] = useState([]);
  const [destinationMarkersObjs, setDestinationMarkersObjs] = useState([]);
  const [destinationRendersObjs, setDestinationRendersObjs] = useState([]);
  const [hoverMarkersObjs, setHoverMarkersObjs] = useState([]);

  const mapRef = useRef(null);
  const loader = new Loader({
    apiKey: "AIzaSyB49fWLirSMEzk-F3YZxeQKbGjn9w16m3o",
    version: 'weekly',
  });

  useEffect(() => {
    loader.load().then(() => {
      const newMap  = new window.google.maps.Map(mapRef.current, {
        center: { lat: 49.8448351, lng: 24.0269755 },
        zoom: 12,
      });

      const newDirectionsService = new window.google.maps.DirectionsService();

      setMap(newMap);
      setDirectionsService(newDirectionsService)
    });
  }, []);

  useEffect(() => {
    if (debugMode) {
      debugMarkersObjs.forEach((feature) => {
        feature.setMap(map)
      });
    } else {
      debugMarkersObjs.forEach((feature) => {
        feature.setMap(null)
      });
    }
  }, [debugMode]);

  useEffect(() => {
    if (mapRef.current && hoverMarker.length > 0) {
      // remove prev hoverMarker
      if (hoverMarkersObjs.length != 0) {
        hoverMarkersObjs[0].setMap(null)
      }

      const markerData = hoverMarker[0]
      const marker = new window.google.maps.Marker({
        position: { lat: +markerData[2], lng: +markerData[1], name: markerData[3]},
        map: map,
        title: markerData[3]
      });
      setHoverMarkersObjs([marker])
    } else if (hoverMarker.length == 0) {
      if (hoverMarkersObjs.length != 0) {
        hoverMarkersObjs[0].setMap(null)
        setHoverMarkersObjs([])
      }
    }
  }, [hoverMarker])

  useEffect(() => {
    // render path
    renderRouter(routeMarkers)

    // declare debug markers
    setDebugMarkersObjs([])
    if (mapRef.current && routeMarkers.length > 0) {
      // Add markers
      let stepId = 0
      routeMarkers.forEach(markerData => {
        const marker = new window.google.maps.Marker({
          position: { lat: markerData[2], lng: markerData[1] },
          map: null,
          title: `Step-${stepId}`
        });
        setDebugMarkersObjs(prevMarkersObjs => [...prevMarkersObjs, marker]);
        stepId++
      });
    }
  }, [routeMarkers])

  useEffect(() => {
    // clear debug markers
    debugMarkersObjs.forEach((feature) => {
      feature.setMap(null)
    });
    setDebugMarkersObjs([])

    // clear render routers
    destinationRendersObjs.forEach((feature) => {
      feature.setMap(null)
    });
    setDestinationRendersObjs([])

    // Clear all wayPts
    destinationMarkersObjs.forEach((feature) => {
      feature.setMap(null)
    });
    setDestinationMarkersObjs([]);

    if (mapRef.current && wayPoints.length > 0) {
      // Add markers
      wayPoints.forEach(markerData => {
        const marker = new window.google.maps.Marker({
          position: { lat: +markerData[2], lng: +markerData[1], name: markerData[3]},
          map: map,
          title: markerData[3]
        });
        setDestinationMarkersObjs(prevMarkersObjs => [...prevMarkersObjs, marker]);
      });
    }
  }, [wayPoints])

  useEffect(() => {
    destinationRendersObjs.forEach((feature) => {
      feature.setMap(null)
    });
    setDestinationRendersObjs([])
  }, [clearMap]);

  const renderRouter = (markers) => {
    var steps = []
    for (let i = 0; i < markers.length; ++i)
    {
      var markerData = markers[i]
      steps.push({ lat: markerData[2], lng: markerData[1], name: 'Step ' + i + 'tab' + markerData[0]})
    }
        
    for (var i = 0, parts = [], max = routerLength; i < steps.length; i = i + max)
    parts.push(steps.slice(i, i + max + 1));

    // Service callback to process service results
    var service_callback = function(response, status, i) {
      if (status != 'OK') {
          console.log('Directions request failed due to ' + status);
          return;
      }

      const directionsRenderer = new window.google.maps.DirectionsRenderer();

      directionsRenderer.setOptions({ suppressMarkers: true, preserveViewport: true });
      directionsRenderer.setDirections(response);
      directionsRenderer.setMap(map);

      setDestinationRendersObjs(prevDestinationRendersObjs => [...prevDestinationRendersObjs, directionsRenderer])
    };

    let delayFactor = 0
    const m_get_directions_route = (request, call_back, i) => {
      directionsService.route(request, function(result, status) {
          if (status === window.google.maps.DirectionsStatus.OK) {
            call_back(result, status, i);
          } else if (status === window.google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
              delayFactor++;
              setTimeout(function () {
                  m_get_directions_route(request, call_back, i);
              }, delayFactor * 1000);
          } else {
              console.log("Route: " + status);
          }
      });
    } 

    // clear directionRenders
    destinationRendersObjs.forEach((feature) => {
      feature.setMap(null)
    });
    setDestinationRendersObjs([])

    for (var i = 0; i < parts.length; i++) {
      var waypoints = [];
      for (var j = 1; j < parts[i].length - 1; j++){
          waypoints.push({location: parts[i][j], stopover: false});
      }
          
      var service_options = {
          origin: parts[i][0],
          destination: parts[i][parts[i].length - 1],
          waypoints: waypoints,
          travelMode: 'WALKING'
      };

      m_get_directions_route(service_options, service_callback, i);
    }
  }

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%' }}/>
  );
};

export default Map;
