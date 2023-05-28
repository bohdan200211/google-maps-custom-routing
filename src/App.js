import Map from "./components/Map";
import './App.css';
import React, { useEffect, useState } from "react";
import CsvNodes from './nodes.csv'
import CsvEdges from './edges.csv'
import CsvTourism from './mapNodesTourism.csv';
import CsvHistoric from './mapNodesHistoric.csv';
import CsvShop from './mapNodesShop.csv';
import CsvAmenity from './mapNodesAmenity.csv';
import Papa from "papaparse";

const nameId = 3

function App() {
  const [stateNode, setStateNode] = useState([]);
  const [stateEdge, setStateEdge] = useState([]);

  const [amenityData, setAmenityData] = useState([]);
  const [tourismData, setTourismData] = useState([]);
  const [shopData, setShopData] = useState([]);
  const [historicData, setHistoricData] = useState([]);  

  const [placesData, setPlacesData] = useState([]);
  const [placesTypeData, setPlacesTypeData] = useState([]);
  const [waypoints,setWaypoints] = useState([]);

  const [openWaypoints, setOpenWaypoints] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [clearMap, setClearMap] = useState(false);

  // tag
  const [selectedOption, setSelectedOption] = useState('amenity');  

  const [debugMarkers, setDebugMarkers] = useState([]);
  const [hoverMarker, setHoverMarker] = useState([]);

  const [totalDistance, setTotalDistance] = useState(0);


  useEffect(()=>{
    async function fetchNodes() {
      Papa.parse(CsvNodes, {
        download: true,
        complete: function (input) {
          setStateNode(input.data.slice(1).map(item=>{return item.map(item2 => { return +item2})}))
            }
      })
    }

    async function fetchEdges() {
      Papa.parse(CsvEdges, {
        download: true,
        complete: function (input) {
          setStateEdge(input.data.slice(1).map(item=>{return item.map(item2 => { return +item2})}))
            }
      })
    }

    async function fetchTourism() {
      Papa.parse(CsvTourism, {
        download: true,
        complete: function (input) {
          setTourismData(input.data.slice(1).map(item=>{return item}))
            }
      })
    }

    async function fetchHistoric() {
      Papa.parse(CsvHistoric, {
        download: true,
        complete: function (input) {
          setHistoricData(input.data.slice(1).map(item=>{return item}))
            }
      })
    }

    async function fetchAmenity() {
      Papa.parse(CsvAmenity, {
        download: true,
        complete: function (input) {
          setAmenityData(input.data.slice(1).map(item=>{return item}))
            }
      })
    }

    async function fetchShop() {
      Papa.parse(CsvShop, {
        download: true,
        complete: function (input) {
          setShopData(input.data.slice(1).map(item=>{return item}))
            }
      })
    }

    fetchNodes();
    fetchEdges();

    fetchAmenity();
    fetchTourism();
    fetchShop();
    fetchHistoric();
  },[])

  useEffect(()=>{
    setPlacesData(amenityData)
    const allSpicificTypeData = amenityData.filter(row => row[4] === 'fuel');
    setPlacesTypeData(allSpicificTypeData)
  },[amenityData])

  const getLengthBetweenNodes = (lat1, lon1, lat2, lon2) => {
    const yDelta = lat1 - lat2;
    const xDelta = lon1 - lon2;
  
    const lineLength = (Math.pow(xDelta, 2) + Math.pow(yDelta, 2));
  
    return lineLength;
  }

  const getRoadRouter = (origin, destination) => {
    var target = origin;
  
    let length = 0
    var result = []
    var visited = []
    result.push(origin)
    visited.push(origin)
    
    while (target[0] !== destination[0])
    {
      // find all connected nodes
      var nearbyNodes = []
      for (let i = 0; i < stateEdge.length; i++) {
        var edge = stateEdge[i]
        if(edge[1] == target[0] || edge[2] == target[0]) {
          const opositeId = edge[1] == target[0] ? edge[2] : edge[1]
          const isPresent = visited.some(arr => arr.includes(opositeId));

          if (!isPresent) {
            nearbyNodes.push(stateNode.find(arr => arr[0] === opositeId))
          }
        }
      }

      if(nearbyNodes.length == 0)
      {
        result.pop()
        target = result[result.length - 1]
        continue
      }

      let minLengthDiff = getLengthBetweenNodes(nearbyNodes[0][2], nearbyNodes[0][1], destination[2], destination[1])
      var newTarget = nearbyNodes[0]
      for (let i = 1; i < nearbyNodes.length; ++i)
      {
        var node = nearbyNodes[i]
        let currLengthDiff = Math.abs(getLengthBetweenNodes(node[2], node[1], destination[2], destination[1]))
        if (currLengthDiff < minLengthDiff)
        {
          minLengthDiff = currLengthDiff
          newTarget = node
        }
      }

      result.push(newTarget)
      visited.push(newTarget)
        
      target = newTarget
      length++;
    }

    return result
  }

  const getClosestNodeByCoordinates = (lat, lon) => {
    let minLengthDiff = getLengthBetweenNodes(stateNode[0][2], stateNode[0][1], lat, lon)
    var closestNode = stateNode[0]
    for (let i = 1; i < stateNode.length; ++i) {
      var node = stateNode[i]
      let currLengthDiff = Math.abs(getLengthBetweenNodes(node[2], node[1], lat, lon))
      if (currLengthDiff < minLengthDiff)
      {
        minLengthDiff = currLengthDiff
        closestNode = node
      }
    }
    return closestNode
  }

  const clearRoadNodes = (wayPoints) => {
    var mergedPoints = []
    mergedPoints.push(wayPoints[0])
    // merge close nodes
    for (let i = 1; i < wayPoints.length; ++i) {
      var first = mergedPoints[mergedPoints.length - 1]
      var second = wayPoints[i]

      if (getLengthBetweenNodes(first[2], first[1], second[2], second[1]) > 3.1e-8) {
        mergedPoints.push(second)
      } 
    }

    var approxPoints = []
    approxPoints.push(mergedPoints[0])
    for (let i = 1; i < mergedPoints.length; ++i) {
      var first = mergedPoints[i - 1]
      var second = mergedPoints[i]

      const delta_lon_angle = first[1] - second[1] // x
      const delta_lat_angel = first[2] - second[2] // y
      const arctanValue = Math.atan(delta_lat_angel, delta_lon_angle);

      let mult = 1
      if (second[1] < first[1]) {
        mult = -1
      }

      const delta_lon = mult * 0.0002 * Math.cos(arctanValue)
      const delta_lat = mult * 0.0002 * Math.sin(arctanValue)

      approxPoints.push([second[0], second[1] - delta_lon, second[2] - delta_lat])
    }
    // todo approximation
    return mergedPoints
  }

  const getRouterByNodes = (wayPoints) => {
    setTotalDistance(0)
    var roadCheckNodes = []
    for (let i = 0; i < wayPoints.length; ++i) {
      roadCheckNodes.push(getClosestNodeByCoordinates(wayPoints[i][2], wayPoints[i][1]))
    }

    var routerResult = []
    for (let i = 0; i < roadCheckNodes.length - 1; ++i) {
      const twoNodesRouter = getRoadRouter(roadCheckNodes[i], roadCheckNodes[i + 1])

      if (i !== roadCheckNodes.length - 1) {
        twoNodesRouter.pop()
      }

      routerResult.push(...twoNodesRouter)
    }

    return clearRoadNodes(routerResult)
  }

  function convertToTitleCase(text) {
    const words = text.split('_'); 
    const convertedText = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  
    return convertedText;
  }
  
  const handleOptionChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedOption(selectedValue);
    // Call your custom function here
    if (selectedValue === "amenity") {
      setPlacesData(amenityData)
    } else if (selectedValue === "tourism") {
      setPlacesData(tourismData)
    } else if (selectedValue === "shop") {
      setPlacesData(shopData)
    } else if (selectedValue === "historic") {
      setPlacesData(historicData) 
    }
  };

  const getTotalDistanceByRoute = (wayPoints) => {
    var totalDist = 0
    for (let j = 1; j < wayPoints.length; ++j)
    {
      const first = wayPoints[j - 1]
      const second = wayPoints[j]
      for (let i = 0; i < stateEdge.length; i++) {
        var edge = stateEdge[i]
        if((edge[1] == first[0] && edge[2] == second[0]) || (edge[1] == second[0] && edge[2] == first[0])) {
          totalDist += edge[3]
        }
      }
    }

    return totalDist
  }

  function handleOptionTypeChange(event) {
    const selectedLanguage = event.target.value;
    const allSpicificTypeData = placesData.filter(row => row[4] === selectedLanguage);
    setPlacesTypeData(allSpicificTypeData)
  }

  const runRouterRenderByWayPts = (waypoints) =>{
    if(waypoints.length >= 2) {
      const routerNodes = getRouterByNodes(waypoints)
      setDebugMarkers(routerNodes)
      setTotalDistance(getTotalDistanceByRoute(routerNodes))
    }
  }

  const clearBtnClicked = () => {
    setDebugMode(false)
    setWaypoints([])
    setClearMap(!clearMap)
  }

  return (
    <div className="App">
      <Map 
      routeMarkers={debugMarkers} 
      wayPoints={waypoints}
      debugMode={debugMode} 
      clearMap={clearMap} 
      hoverMarker={hoverMarker}/>
      {placesData.length > 0  && <div className="sidebar"> 
      <div className="start-selection">
        <b>Types:</b>
        <label>
          <input type="radio" value="amenity" checked={selectedOption === 'amenity'}
            onChange={handleOptionChange}
          /> Amenity </label>
        <br />
        <label>
          <input type="radio" value="tourism" checked={selectedOption === 'tourism'}
            onChange={handleOptionChange}
          /> Tourism </label>
        <br />
        <label>
          <input type="radio" value="shop" checked={selectedOption === 'shop'}
            onChange={handleOptionChange}
          /> Shop </label>
        <br />
        <label>
          <input type="radio" value="historic" checked={selectedOption === 'historic'}
            onChange={handleOptionChange}
          /> Historic </label>
      </div>

      <div className="start-selection">
      <b for="lang">Сategories</b>
      <select className="start-selection-option" onChange={handleOptionTypeChange} style={{width: "100%", "text-align":"center"}}>
        {[...new Set(placesData.map(row => row[4]))].map((tagType) => (
          <option key={tagType} value={tagType}>{convertToTitleCase(tagType)}</option>
        ))}
      </select>
      </div>

      <div className="start-selection">
        <b>Waypoints:</b>
        <div className="start-selection-option-wrapper">
          {waypoints && waypoints.map(item=> 
          <div key={`button-listpt${item[0]}`} className="waypoints-selected" 
            onClick={()=>setWaypoints(waypoints.filter(function(element) {return element[0] !== item[0];}))}>
            {item[nameId]}
          </div>)}
          <div className="start-selection-option-wrapper">
            <button key="button-listpt" className="start-selection-option" style={{width: "100%"}} onClick={()=>{setOpenWaypoints(!openWaypoints)}}>
              Add waypoint
            </button>
            {openWaypoints && <div className="start-selection-list">
            {placesTypeData && placesTypeData.filter(item=> waypoints.indexOf(item) === -1)
            .map(place=><button key={`button-listpt${place[0]}`} className="start-selection-item" onClick={()=>{
              setWaypoints(state=>[...waypoints,place])
              setHoverMarker([])
              setOpenWaypoints(!openWaypoints)}} onMouseOver={()=>setHoverMarker([place])} onMouseOut={()=>setHoverMarker([]) }>{place[nameId]}</button>)}
            </div>}
          </div>
        </div>
      </div>

      <div className="start-selection"  id="btns" style={{alignItems:"center"}}>
        <b>Way:</b>
        <span>--{waypoints.map((item)=><>{item[nameId]}--</>)}</span>
      </div>

      <div className="start-selection"  id="btns" style={{alignItems:"center"}}>
        <b>Total distance:</b>
        <span>{`${(totalDistance / 1000).toFixed(1)} km`}</span>
      </div>

      <div className="start-selection">
        <button key="button-route" className="start-selection-item" style={{border:"1px solid black"}}
        onClick={()=>runRouterRenderByWayPts(waypoints)}>Route</button>
        <button key="button-clear" className="start-selection-item" style={{border:"1px solid black"}}
        onClick={()=>clearBtnClicked()}>Clear</button>
        <button key="button-debug" className="start-selection-item" style={{border:"1px solid black"}}
        onClick={()=>setDebugMode(!debugMode)}>Debug</button>
      </div>
      <div id="directions-panel"></div>
      </div>}
    </div>
  );
}

export default App;
