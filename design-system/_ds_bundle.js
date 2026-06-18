/* @ds-bundle: {"format":3,"namespace":"SighthoundDesignSystem_9b447e","components":[],"sourceHashes":{"ui_kits/alpr-app/AppShell.jsx":"7bc76c57260f","ui_kits/alpr-app/EventStream.jsx":"d40cb18c0e89","ui_kits/alpr-app/VehicleDetail.jsx":"cd6c5d326103","ui_kits/redactor-app/DetectionPanel.jsx":"fd5e4d29b9b0","ui_kits/redactor-app/MediaList.jsx":"7009c7b79f81","ui_kits/redactor-app/RedactorShell.jsx":"a2b3ee5a4a73","ui_kits/redactor-app/VideoCanvas.jsx":"5e0021a36281","ui_kits/sighthound-marketing/Capabilities.jsx":"4eb723a4408d","ui_kits/sighthound-marketing/CustomerLogos.jsx":"ba8cf4883a5d","ui_kits/sighthound-marketing/Footer.jsx":"b82816421926","ui_kits/sighthound-marketing/Hero.jsx":"34bfb83866ff","ui_kits/sighthound-marketing/Marquee.jsx":"146e4ddb3d3e","ui_kits/sighthound-marketing/Nav.jsx":"7386f4ca2021","ui_kits/sighthound-marketing/ProductSpotlight.jsx":"a442e1892764","ui_kits/sighthound-marketing/Schematic.jsx":"9a183f30ca93","ui_kits/sighthound-marketing/Stats.jsx":"b28f0f7054a3","ui_kits/video-app/CameraGrid.jsx":"7e5bfd34b965","ui_kits/video-app/EventsPanel.jsx":"7952d8879ffb","ui_kits/video-app/Timeline.jsx":"8da287d87319","ui_kits/video-app/VideoShell.jsx":"ae64dfde548b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SighthoundDesignSystem_9b447e = window.SighthoundDesignSystem_9b447e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/alpr-app/AppShell.jsx
try { (() => {
const {
  useState
} = React;
function AppShell({
  children
}) {
  const nav = [{
    k: 'live',
    l: 'Live operations',
    i: 'M3 12h4l2-6 4 12 2-6h4 M21 12h-2'
  }, {
    k: 'search',
    l: 'Search',
    i: 'M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.3-4.3'
  }, {
    k: 'vehicles',
    l: 'Vehicles',
    i: 'M3 13l1.5-5h11L17 13 M3 13h14v5H3z M6 18v2 M14 18v2'
  }, {
    k: 'sites',
    l: 'Sites & lanes',
    i: 'M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z M12 11a2 2 0 100-4 2 2 0 000 4z'
  }, {
    k: 'analytics',
    l: 'Analytics',
    i: 'M3 3v18h18 M7 14l4-4 3 3 5-6'
  }, {
    k: 'watchlist',
    l: 'Watchlist',
    i: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z',
    count: 4
  }, {
    k: 'settings',
    l: 'Settings',
    i: 'M12 8a4 4 0 100 8 4 4 0 000-8z M19 12a7 7 0 00-.2-1.7l2-1.5-2-3.4-2.3.9a7 7 0 00-3-1.7L13 2h-2l-.5 2.6a7 7 0 00-3 1.7l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-.9a7 7 0 003 1.7L11 22h2l.5-2.6a7 7 0 003-1.7l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z'
  }];
  const [active, setActive] = useState('live');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      height: '100vh',
      background: '#f6f8fb',
      fontFamily: 'Lexend',
      fontWeight: 400,
      color: '#1a1d38'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      background: '#1a1d38',
      color: '#fff',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 8px 12px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/sighthound-logo-white.png",
    style: {
      height: 30
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 8px 18px',
      borderBottom: '1px solid #2a2e56',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#8792e8',
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "ALPR+"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#dee2f8',
      marginTop: 2
    }
  }, "City of Phoenix")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      flex: 1
    }
  }, nav.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.k,
    onClick: () => setActive(n.k),
    style: {
      textAlign: 'left',
      background: active === n.k ? '#2a2e56' : 'transparent',
      border: 0,
      color: active === n.k ? '#fff' : '#dee2f8',
      fontFamily: 'Lexend',
      fontSize: 14,
      fontWeight: 400,
      padding: '10px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: n.i
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, n.l), n.count !== undefined && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '1px 7px',
      borderRadius: 999,
      background: '#f99f25',
      color: '#1a1d38',
      fontWeight: 600
    }
  }, n.count)))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid #2a2e56',
      paddingTop: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 999,
      background: 'linear-gradient(135deg,#4f60dc,#f62470)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600,
      color: '#fff'
    }
  }, "TM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "T. Marquez"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#8792e8',
      fontSize: 11
    }
  }, "Traffic Operations")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, children));
}
function TopBar() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: '#fff',
      borderBottom: '1px solid #e4e8ef',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 500,
      color: '#1a1d38'
    }
  }, "Live operations"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64708a'
    }
  }, "All 12 sites \xB7 47 active lanes")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: '#e7f4ed',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      color: '#1f9d55'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: '#1f9d55',
      boxShadow: '0 0 0 4px rgba(31,157,85,.20)'
    }
  }), "Live \xB7 14.3 / min")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      border: '1px solid #d9dfe6',
      background: '#fff',
      padding: '9px 14px',
      borderRadius: 10,
      fontSize: 13,
      color: '#1a1d38',
      cursor: 'pointer',
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "5",
    width: "4",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "5",
    width: "4",
    height: "14"
  })), "Pause stream"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: '1px solid #d9dfe6',
      background: '#fff',
      padding: '9px 14px',
      borderRadius: 10,
      fontSize: 13,
      color: '#1a1d38',
      cursor: 'pointer'
    }
  }, "Export"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: '#4f60dc',
      color: '#fff',
      padding: '9px 16px',
      borderRadius: 10,
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'Lexend',
      fontWeight: 400
    }
  }, "+ Add filter")));
}
window.AlprAppShell = AppShell;
window.AlprTopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/alpr-app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/alpr-app/EventStream.jsx
try { (() => {
const EVENTS = [{
  id: 'e01',
  t: '09:42:18',
  plate: '7ABC123',
  region: 'CA',
  make: 'Tesla',
  model: 'Model 3',
  year: 2023,
  color: 'White',
  conf: 0.98,
  site: 'Loop 202',
  lane: 'WB · 3',
  flag: null
}, {
  id: 'e02',
  t: '09:42:11',
  plate: '4XKD891',
  region: 'NV',
  make: 'Ford',
  model: 'F-150',
  year: 2020,
  color: 'Silver',
  conf: 0.96,
  site: 'Camelback',
  lane: 'NB · 1',
  flag: null
}, {
  id: 'e03',
  t: '09:42:04',
  plate: '8RTL204',
  region: 'CA',
  make: 'Toyota',
  model: 'Camry',
  year: 2018,
  color: 'Black',
  conf: 0.99,
  site: 'I-10',
  lane: 'EB · 4',
  flag: 'watch'
}, {
  id: 'e04',
  t: '09:41:55',
  plate: '2GHM559',
  region: 'AZ',
  make: 'Honda',
  model: 'CR-V',
  year: 2021,
  color: 'Blue',
  conf: 0.94,
  site: 'Camelback',
  lane: 'SB · 2',
  flag: null
}, {
  id: 'e05',
  t: '09:41:30',
  plate: '9PLN710',
  region: 'CA',
  make: 'BMW',
  model: 'X5',
  year: 2019,
  color: 'Gray',
  conf: 0.97,
  site: 'Loop 202',
  lane: 'EB · 1',
  flag: null
}, {
  id: 'e06',
  t: '09:41:18',
  plate: '3SDR882',
  region: 'CA',
  make: 'Chevy',
  model: 'Tahoe',
  year: 2022,
  color: 'Black',
  conf: 0.99,
  site: 'I-10',
  lane: 'EB · 3',
  flag: 'alert'
}, {
  id: 'e07',
  t: '09:41:02',
  plate: '5JKF291',
  region: 'TX',
  make: 'Ram',
  model: '1500',
  year: 2017,
  color: 'Red',
  conf: 0.91,
  site: 'Loop 202',
  lane: 'WB · 2',
  flag: null
}, {
  id: 'e08',
  t: '09:40:47',
  plate: '1WQM004',
  region: 'CA',
  make: 'Toyota',
  model: 'RAV4',
  year: 2024,
  color: 'White',
  conf: 0.95,
  site: 'Camelback',
  lane: 'NB · 2',
  flag: null
}, {
  id: 'e09',
  t: '09:40:22',
  plate: '6BVC553',
  region: 'NV',
  make: 'Subaru',
  model: 'Outback',
  year: 2019,
  color: 'Green',
  conf: 0.93,
  site: 'I-10',
  lane: 'WB · 4',
  flag: null
}, {
  id: 'e10',
  t: '09:39:51',
  plate: '8ZTP118',
  region: 'AZ',
  make: 'Hyundai',
  model: 'Elantra',
  year: 2021,
  color: 'Silver',
  conf: 0.96,
  site: 'Loop 202',
  lane: 'EB · 2',
  flag: null
}, {
  id: 'e11',
  t: '09:39:18',
  plate: '4MKR777',
  region: 'CA',
  make: 'Tesla',
  model: 'Y',
  year: 2022,
  color: 'Blue',
  conf: 0.98,
  site: 'Camelback',
  lane: 'SB · 3',
  flag: null
}, {
  id: 'e12',
  t: '09:38:55',
  plate: '2NDS104',
  region: 'CA',
  make: 'GMC',
  model: 'Sierra',
  year: 2020,
  color: 'White',
  conf: 0.94,
  site: 'I-10',
  lane: 'EB · 1',
  flag: null
}];
window.EVENTS = EVENTS;
function EventStream({
  activeId,
  onSelect
}) {
  const conf = c => c >= 0.95 ? '#1f9d55' : c >= 0.90 ? '#4f60dc' : '#f99f25';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 24px',
      background: '#fff',
      borderBottom: '1px solid #e4e8ef',
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, [{
    l: 'All sites',
    active: true,
    close: false
  }, {
    l: 'Last 1 h',
    active: true,
    close: true
  }, {
    l: 'Confidence > 0.85',
    active: true,
    close: true
  }].map(c => /*#__PURE__*/React.createElement("span", {
    key: c.l,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 10px',
      background: c.active ? '#eef1fc' : '#fff',
      color: '#2e3ba4',
      border: '1px solid #dee2f8',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500
    }
  }, c.l, c.close && /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: 'none',
      color: '#4f60dc',
      cursor: 'pointer',
      fontSize: 13,
      padding: 0,
      lineHeight: 1
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      position: 'relative',
      width: 240
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#9aa3b2",
    strokeWidth: "1.75",
    style: {
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 21l-4.3-4.3",
    strokeLinecap: "round"
  })), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search plate, MMCG, site\u2026",
    style: {
      width: '100%',
      padding: '8px 12px 8px 32px',
      border: '1px solid #d9dfe6',
      borderRadius: 8,
      fontSize: 13,
      fontFamily: 'Lexend',
      color: '#1a1d38'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '14px 24px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      marginBottom: 10,
      paddingLeft: 4
    }
  }, "Today"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, EVENTS.map(e => {
    const isActive = e.id === activeId;
    const flagBg = e.flag === 'alert' ? '#fdebf2' : e.flag === 'watch' ? '#fef4e0' : null;
    const flagFg = e.flag === 'alert' ? '#f62470' : e.flag === 'watch' ? '#f05d22' : null;
    return /*#__PURE__*/React.createElement("button", {
      key: e.id,
      onClick: () => onSelect(e.id),
      style: {
        textAlign: 'left',
        background: isActive ? '#eef1fc' : '#fff',
        border: '1px solid ' + (isActive ? '#4f60dc' : '#e4e8ef'),
        borderLeft: '3px solid ' + (isActive ? '#4f60dc' : e.flag === 'alert' ? '#f62470' : e.flag === 'watch' ? '#f99f25' : 'transparent'),
        borderRadius: 10,
        padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: '12px 80px 130px 1fr 130px 60px',
        gap: 14,
        alignItems: 'center',
        cursor: 'pointer',
        fontFamily: 'Lexend'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: conf(e.conf),
        justifySelf: 'center'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: '#64708a',
        fontFamily: 'SF Mono, Menlo, monospace',
        fontVariantNumeric: 'tabular-nums'
      }
    }, e.t), /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '3px 8px',
        background: '#1a1d38',
        color: '#fff',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'SF Mono, Menlo, monospace',
        letterSpacing: '.04em',
        width: 'fit-content'
      }
    }, e.region, " \xB7 ", e.plate), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: '#1a1d38',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, e.color, " ", e.year, " ", e.make, " ", e.model), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#64708a'
      }
    }, e.site, " \xB7 ", e.lane)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        alignItems: 'center'
      }
    }, flagBg && /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '2px 8px',
        borderRadius: 999,
        background: flagBg,
        color: flagFg,
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.06em'
      }
    }, e.flag === 'alert' ? 'Alert' : 'Watchlist')), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#64708a',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums'
      }
    }, e.conf.toFixed(2)));
  }))));
}
window.AlprEventStream = EventStream;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/alpr-app/EventStream.jsx", error: String((e && e.message) || e) }); }

// ui_kits/alpr-app/VehicleDetail.jsx
try { (() => {
function VehicleDetail({
  event
}) {
  if (!event) return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 380,
      background: '#fff',
      borderLeft: '1px solid #e4e8ef',
      padding: 24,
      color: '#64708a',
      fontFamily: 'Lexend'
    }
  }, "Select an event to see vehicle details.");
  const confColor = event.conf >= 0.95 ? '#1f9d55' : event.conf >= 0.90 ? '#4f60dc' : '#f99f25';
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 380,
      background: '#fff',
      borderLeft: '1px solid #e4e8ef',
      padding: 0,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Lexend'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 22px 18px',
      borderBottom: '1px solid #eef1fc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '5px 10px',
      background: '#1a1d38',
      color: '#fff',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'SF Mono, Menlo, monospace',
      letterSpacing: '.04em'
    }
  }, event.region, " \xB7 ", event.plate), event.flag === 'alert' && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 8px',
      borderRadius: 999,
      background: '#fdebf2',
      color: '#f62470',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.06em'
    }
  }, "Alert"), event.flag === 'watch' && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 8px',
      borderRadius: 999,
      background: '#fef4e0',
      color: '#f05d22',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.06em'
    }
  }, "Watchlist")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 500,
      color: '#1a1d38',
      lineHeight: 1.2,
      marginBottom: 2
    }
  }, event.color, " ", event.year, " ", event.make, " ", event.model), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64708a'
    }
  }, "Captured ", event.t, " \xB7 ", event.site, " \xB7 ", event.lane)), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '18px 22px 8px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sh-pattern-scan",
    style: {
      position: 'relative',
      background: '#1a1d38',
      borderRadius: 12,
      aspectRatio: '16/9',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 320 180",
    width: "100%",
    height: "100%",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "rgba(255,255,255,.08)",
    strokeWidth: "1"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,150 Q160,90 320,150"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0,90 Q160,40 320,90"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0,180 Q160,140 320,180",
    strokeDasharray: "6 8"
  })), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "118",
    y: "76",
    width: "86",
    height: "58",
    fill: "none",
    stroke: "#4f60dc",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "118",
    y: "61",
    width: "58",
    height: "14",
    fill: "#4f60dc"
  }), /*#__PURE__*/React.createElement("text", {
    x: "124",
    y: "72",
    fill: "#fff",
    fontSize: "9",
    fontFamily: "SF Mono, Menlo, monospace",
    fontWeight: "600"
  }, "VEHICLE \xB7 ", (event.conf * 100).toFixed(0), "%"), /*#__PURE__*/React.createElement("rect", {
    x: "140",
    y: "116",
    width: "42",
    height: "11",
    fill: "none",
    stroke: "#f99f25",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "140",
    y: "105",
    width: "36",
    height: "10",
    fill: "#f99f25"
  }), /*#__PURE__*/React.createElement("text", {
    x: "143",
    y: "113",
    fill: "#1a1d38",
    fontSize: "7",
    fontFamily: "SF Mono, Menlo, monospace",
    fontWeight: "600"
  }, "PLATE \xB7 99%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      left: 10,
      fontSize: 9,
      color: '#dee2f8',
      fontFamily: 'SF Mono, Menlo, monospace',
      letterSpacing: '.05em',
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", null, "16:9 EVIDENCE"), /*#__PURE__*/React.createElement("span", null, "\xB7 F#82914"), /*#__PURE__*/React.createElement("span", null, "\xB7 ", event.t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8
    }
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sh-pattern-scan",
    style: {
      flex: 1,
      aspectRatio: '16/9',
      background: '#1a1d38',
      borderRadius: 6,
      opacity: .5 + i * 0.12
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 22px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      marginBottom: 10
    }
  }, "Profile"), /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px 14px'
    }
  }, [['Make', event.make], ['Model', event.model], ['Year', event.year], ['Color', event.color], ['Region', event.region], ['Generation', event.year >= 2020 ? '6th' : '5th']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      fontSize: 10,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      fontWeight: 600
    }
  }, k), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      fontSize: 13,
      color: '#1a1d38',
      fontWeight: 500
    }
  }, v))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 22px',
      borderTop: '1px solid #eef1fc',
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Confidence"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: confColor,
      fontVariantNumeric: 'tabular-nums'
    }
  }, event.conf.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: '#eff3f7',
      borderRadius: 999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: event.conf * 100 + '%',
      background: confColor,
      borderRadius: 999
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 22px',
      borderTop: '1px solid #eef1fc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      marginBottom: 10
    }
  }, "Location"), /*#__PURE__*/React.createElement("div", {
    className: "sh-pattern-topo",
    style: {
      position: 'relative',
      background: '#f6f8fb',
      borderRadius: 10,
      height: 120,
      border: '1px solid #e4e8ef',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 320 120",
    width: "100%",
    height: "100%",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "#9aa3b2",
    strokeWidth: "1.5",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M-10,40 Q80,30 160,55 T330,70"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-10,80 Q80,70 160,90 T330,100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "60",
    y1: "0",
    x2: "100",
    y2: "120",
    stroke: "#d9dfe6",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "220",
    y1: "0",
    x2: "240",
    y2: "120",
    stroke: "#d9dfe6",
    strokeWidth: "1"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(170,58)"
  }, /*#__PURE__*/React.createElement("circle", {
    r: "10",
    fill: "rgba(79,96,220,.18)"
  }), /*#__PURE__*/React.createElement("circle", {
    r: "5",
    fill: "#4f60dc",
    stroke: "#fff",
    strokeWidth: "2"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 10,
      bottom: 8,
      fontSize: 10,
      color: '#4b4f73',
      fontFamily: 'SF Mono, Menlo, monospace'
    }
  }, "33.5\xB0N \xB7 112.0\xB0W")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#1a1d38',
      marginTop: 8,
      fontWeight: 500
    }
  }, event.site), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a'
    }
  }, "Lane ", event.lane)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 22px 24px',
      borderTop: '1px solid #eef1fc',
      marginTop: 'auto',
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      padding: '9px 14px',
      fontSize: 13,
      borderRadius: 8
    }
  }, "+ Watchlist"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary",
    style: {
      padding: '9px 14px',
      fontSize: 13,
      borderRadius: 8
    }
  }, "Export evidence"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: 'transparent',
      color: '#f62470',
      padding: '9px 12px',
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'Lexend',
      fontWeight: 500
    }
  }, "Flag")));
}
window.AlprVehicleDetail = VehicleDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/alpr-app/VehicleDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/redactor-app/DetectionPanel.jsx
try { (() => {
function DetectionPanel({
  detections,
  onToggle
}) {
  const colorFor = t => t === 'face' ? '#f62470' : t === 'plate' ? '#f99f25' : t === 'audio' ? '#4f60dc' : '#64708a';
  // Detections over time (per 10s bucket)
  const buckets = [3, 5, 4, 7, 6, 9, 11, 8, 12, 10, 14, 11, 9, 7, 5, 4];
  const maxB = Math.max(...buckets);
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 320,
      background: '#fff',
      borderLeft: '1px solid #e4e8ef',
      padding: 0,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Lexend'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 18px 14px',
      borderBottom: '1px solid #eef1fc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      marginBottom: 10
    }
  }, "Auto-detected"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, [['Faces', 12, '#f62470'], ['Plates', 4, '#f99f25'], ['People', 7, '#4f60dc'], ['Screens', 1, '#1a1d38']].map(([l, n, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      padding: 10,
      background: '#f6f8fb',
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 500,
      color: c,
      fontFamily: 'Lexend',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a',
      marginTop: 4
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px',
      borderBottom: '1px solid #eef1fc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Detections over time"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a'
    }
  }, "per 10 s")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 3,
      height: 48
    }
  }, buckets.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: b / maxB * 100 + '%',
      background: i === 7 ? '#4f60dc' : '#dee2f8',
      borderRadius: 2,
      minHeight: 2
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 10,
      color: '#9aa3b2',
      marginTop: 4,
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement("span", null, "00:00"), /*#__PURE__*/React.createElement("span", null, "02:14"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Detections"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 11,
      fontWeight: 500
    }
  }, "Invert")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, detections.map((d, i) => /*#__PURE__*/React.createElement("label", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      border: '1px solid #e4e8ef',
      borderRadius: 8,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: d.on,
    onChange: () => onToggle?.(i),
    style: {
      accentColor: '#4f60dc'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: colorFor(d.type)
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: '#1a1d38',
      textTransform: 'capitalize',
      fontFamily: 'Lexend'
    }
  }, d.type, " #", String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 11,
      color: '#64708a',
      fontFamily: 'SF Mono, Menlo, monospace',
      fontVariantNumeric: 'tabular-nums'
    }
  }, d.t))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      padding: '14px 18px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sh-pattern-topo",
    style: {
      padding: 14,
      background: '#eef1fc',
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#2e3ba4",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: '#2e3ba4'
    }
  }, "CJIS \xB7 FOIA \xB7 GDPR-ready")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#4b4f73',
      lineHeight: 1.5
    }
  }, "Media never leaves your environment. Chain of custody preserved.")))));
}
window.DetectionPanel = DetectionPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/redactor-app/DetectionPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/redactor-app/MediaList.jsx
try { (() => {
function MediaList({
  items,
  activeId,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 280,
      background: '#fff',
      borderRight: '1px solid #e4e8ef',
      padding: 16,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "overline"
  }, "Project files"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: '#eef1fc',
      color: '#4f60dc',
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 500,
      cursor: 'pointer'
    }
  }, "+ Upload")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, items.map(it => {
    const isActive = it.id === activeId;
    const sColor = it.status === 'Redacted' ? '#1f9d55' : it.status === 'Processing' ? '#f99f25' : '#64708a';
    const sBg = it.status === 'Redacted' ? '#e7f4ed' : it.status === 'Processing' ? '#fff4e0' : '#eff3f7';
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onSelect?.(it.id),
      style: {
        textAlign: 'left',
        background: isActive ? '#eef1fc' : '#fff',
        border: '1px solid ' + (isActive ? '#4f60dc' : '#e4e8ef'),
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        gap: 10,
        cursor: 'pointer',
        fontFamily: 'Lexend'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 56,
        height: 40,
        borderRadius: 6,
        background: '#1a1d38',
        overflow: 'hidden',
        flexShrink: 0
      }
    }, it.thumb && /*#__PURE__*/React.createElement("img", {
      src: it.thumb,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: '#1a1d38',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, it.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#64708a',
        marginTop: 2
      }
    }, it.duration, " \xB7 ", it.size), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        marginTop: 5,
        fontSize: 10,
        fontWeight: 500,
        color: sColor,
        background: sBg,
        padding: '2px 8px',
        borderRadius: 999
      }
    }, it.status)));
  })));
}
window.MediaList = MediaList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/redactor-app/MediaList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/redactor-app/RedactorShell.jsx
try { (() => {
const {
  useState
} = React;
function RedactorAppShell({
  children,
  active,
  onNav
}) {
  const nav = [{
    k: 'projects',
    l: 'Projects',
    i: 'M3 7h18M3 12h18M3 17h12'
  }, {
    k: 'editor',
    l: 'Editor',
    i: 'M12 4v16m8-8H4'
  }, {
    k: 'library',
    l: 'Library',
    i: 'M4 4h16v16H4z M4 10h16'
  }, {
    k: 'detectors',
    l: 'Detectors',
    i: 'M12 8a4 4 0 100 8 4 4 0 000-8z M3 12h2 M19 12h2 M12 3v2 M12 19v2',
    count: 8
  }, {
    k: 'activity',
    l: 'Activity',
    i: 'M4 12h4l2-6 4 12 2-6h4'
  }, {
    k: 'settings',
    l: 'Settings',
    i: 'M12 8a4 4 0 100 8 4 4 0 000-8z'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      height: '100vh',
      background: '#f6f8fb',
      fontFamily: 'Lexend',
      fontWeight: 400,
      color: '#1a1d38'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      background: '#1a1d38',
      color: '#fff',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 8px 12px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/redactor-logo-horizontal.webp",
    style: {
      height: 28,
      filter: 'brightness(0) invert(1)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 8px 18px',
      borderBottom: '1px solid #2a2e56',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#8792e8',
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Redactor"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#dee2f8',
      marginTop: 2
    }
  }, "Heritage School District")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      margin: '0 6px 14px',
      padding: '11px 14px',
      fontSize: 13,
      background: '#4f60dc',
      borderRadius: 10
    }
  }, "+ New project"), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      flex: 1
    }
  }, nav.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.k,
    onClick: () => onNav?.(n.k),
    style: {
      textAlign: 'left',
      background: active === n.k ? '#2a2e56' : 'transparent',
      border: 0,
      color: active === n.k ? '#fff' : '#dee2f8',
      fontFamily: 'Lexend',
      fontSize: 14,
      fontWeight: 400,
      padding: '10px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: n.i
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, n.l), n.count !== undefined && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '1px 7px',
      borderRadius: 999,
      background: 'rgba(135,146,232,.2)',
      color: '#dee2f8',
      fontWeight: 600
    }
  }, n.count)))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid #2a2e56',
      paddingTop: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 999,
      background: 'linear-gradient(135deg,#f99f25,#f62470)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600,
      color: '#fff'
    }
  }, "KS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, "K. Skelly"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#8792e8',
      fontSize: 11
    }
  }, "Legal & Compliance")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, children));
}
function RedactorTopBar({
  title,
  subtitle
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: '#fff',
      borderBottom: '1px solid #e4e8ef',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 500,
      color: '#1a1d38',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64708a'
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: '#fff4e0',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      color: '#f05d22'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: '#f99f25',
      boxShadow: '0 0 0 4px rgba(249,159,37,.20)'
    }
  }), "Processing \xB7 2 jobs in queue")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '6px 12px',
      background: '#eef1fc',
      color: '#2e3ba4',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500
    }
  }, "Auto-saved \xB7 just now"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: '1px solid #d9dfe6',
      background: '#fff',
      padding: '9px 14px',
      borderRadius: 10,
      fontSize: 13,
      color: '#1a1d38',
      cursor: 'pointer'
    }
  }, "Preview"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: '#4f60dc',
      color: '#fff',
      padding: '9px 16px',
      borderRadius: 10,
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'Lexend',
      fontWeight: 400
    }
  }, "Export")));
}
window.AppShell = RedactorAppShell;
window.TopBar = RedactorTopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/redactor-app/RedactorShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/redactor-app/VideoCanvas.jsx
try { (() => {
function VideoCanvas({
  src,
  detections,
  playing,
  onTogglePlay,
  time,
  duration
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: '#1a1d38',
      borderRadius: 14,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 20px rgba(26,29,56,.10)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: .92
    }
  }), detections.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      left: d.x + '%',
      top: d.y + '%',
      width: d.w + '%',
      height: d.h + '%',
      border: '2px solid ' + (d.type === 'face' ? '#f62470' : d.type === 'plate' ? '#f99f25' : '#4f60dc'),
      borderRadius: 6,
      background: 'rgba(26,29,56,.55)',
      backdropFilter: 'blur(8px)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -20,
      left: -2,
      padding: '2px 8px',
      background: d.type === 'face' ? '#f62470' : d.type === 'plate' ? '#f99f25' : '#4f60dc',
      color: '#fff',
      fontSize: 10,
      borderRadius: 4,
      fontWeight: 500,
      fontFamily: 'Lexend',
      textTransform: 'uppercase',
      letterSpacing: '.06em'
    }
  }, d.type, " \xB7 ", d.conf, "%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      left: 14,
      padding: '6px 12px',
      background: 'rgba(26,29,56,.7)',
      color: '#fff',
      borderRadius: 999,
      fontSize: 11,
      fontFamily: 'Lexend',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 999,
      background: '#f62470'
    }
  }), " REC \xB7 Bodycam 04")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '10px 14px',
      background: '#fff',
      border: '1px solid #e4e8ef',
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onTogglePlay,
    style: {
      width: 40,
      height: 40,
      borderRadius: 999,
      background: '#4f60dc',
      color: '#fff',
      border: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, playing ? /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "5",
    width: "4",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "5",
    width: "4",
    height: "14"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 4l14 8-14 8z"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#4b4f73',
      fontVariantNumeric: 'tabular-nums',
      fontFamily: 'Lexend',
      fontWeight: 500
    }
  }, time, " / ", duration), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 6,
      background: '#eff3f7',
      borderRadius: 999,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: '0 60% 0 0',
      background: 'linear-gradient(90deg,#4f60dc,#f62470)',
      borderRadius: 999
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '40%',
      top: -4,
      width: 14,
      height: 14,
      borderRadius: 999,
      background: '#fff',
      border: '2px solid #4f60dc',
      boxShadow: '0 2px 6px rgba(26,29,56,.2)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a'
    }
  }, "1.0\xD7")));
}
window.VideoCanvas = VideoCanvas;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/redactor-app/VideoCanvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/Capabilities.jsx
try { (() => {
function Capabilities() {
  const cards = [{
    i: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z',
    title: 'Real-time detection',
    body: 'Vehicles, plates, people and objects in under 40 ms — at the edge, on the device, where the data is born.'
  }, {
    i: 'M3 4h18M3 9h18M3 14h12M3 19h8',
    title: 'Structured events',
    body: 'Every detection emits make, model, color, generation, region, lane and confidence. Ready for your stack.'
  }, {
    i: 'M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z M9 12l2 2 4-4',
    title: 'Privacy by design',
    body: 'Data stays in your environment. CJIS, FOIA, GDPR-aligned. Faces and plates can be redacted on capture.'
  }, {
    i: 'M3 12h6m6 0h6 M12 3v6m0 6v6 M5 5l3 3m8 8l3 3 M19 5l-3 3m-8 8l-3 3',
    title: 'Open & integrated',
    body: 'REST, MQTT, webhooks, RTSP. Drop into existing VMS, ITS, parking and access systems.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '112px 32px',
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 780,
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      marginBottom: 12
    }
  }, "Capabilities"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 44,
      lineHeight: 1.1,
      marginBottom: 18
    }
  }, "State-of-the-art computer vision, shaped for production."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#4b4f73',
      maxWidth: 620,
      fontWeight: 400
    }
  }, "Built in our own research lab. Tuned on a billion images a year. Deployed at the edge so latency, cost and privacy stay where they should.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 20
    }
  }, cards.map(c => /*#__PURE__*/React.createElement("article", {
    key: c.title,
    style: {
      background: '#fff',
      borderRadius: 16,
      padding: '26px 26px 28px',
      border: '1px solid #e4e8ef',
      boxShadow: '0 2px 6px rgba(26,29,56,.06)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: '#eef1fc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#4f60dc",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: c.i
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 18,
      fontWeight: 500,
      marginBottom: 8,
      color: '#1a1d38',
      lineHeight: 1.3
    }
  }, c.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: '#4b4f73',
      lineHeight: 1.55,
      margin: 0
    }
  }, c.body))))));
}
window.Capabilities = Capabilities;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/Capabilities.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/CustomerLogos.jsx
try { (() => {
function CustomerLogos() {
  const customers = ['Argonne Lab', 'Atea', 'Lotus', 'Zepcam', 'Garmin', 'SafeFleet', 'Bynet', 'Consilio', 'Bioclinica', 'LensLock', 'Triumph', 'Transport Malta'];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 32px',
      background: '#fff',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      marginBottom: 12
    }
  }, "Trusted partners"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 36,
      marginBottom: 48,
      fontWeight: 500
    }
  }, "Over 2,800 customers & partners \u2014 in 47 countries."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1080,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(6,1fr)',
      gap: 1,
      background: '#e4e8ef',
      border: '1px solid #e4e8ef',
      borderRadius: 14,
      overflow: 'hidden'
    }
  }, customers.map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      height: 84,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Lexend',
      fontWeight: 500,
      fontSize: 14,
      color: '#9aa3b2',
      letterSpacing: '.02em',
      padding: '0 12px',
      textAlign: 'center'
    }
  }, c))));
}
window.CustomerLogos = CustomerLogos;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/CustomerLogos.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/Footer.jsx
try { (() => {
function Footer() {
  const cols = [{
    h: 'Solutions',
    items: ['Retail & QSR', 'Law Enforcement', 'Parking & EV', 'Legal, FOIA & Evidence Review']
  }, {
    h: 'Products',
    items: ['Sighthound ALPR+', 'Sighthound Redactor', 'Sighthound Hardware', 'Sighthound Video']
  }, {
    h: 'Support',
    items: ['Frequently Asked Questions', 'Contact Sales', 'Create Support Ticket']
  }, {
    h: 'About',
    items: ['Blog', 'Team', 'Technology', 'Partners']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: '#1a1d38',
      color: '#fff',
      padding: '80px 32px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 40,
      paddingBottom: 48
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      color: '#8792e8',
      marginBottom: 18
    }
  }, c.h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, c.items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: '#dee2f8',
      fontSize: 14,
      fontWeight: 300,
      textDecoration: 'none'
    }
  }, i))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      borderTop: '1px solid #2a2e56',
      paddingTop: 32,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: '#8792e8',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/sighthound-logo-white.png",
    style: {
      height: 32
    }
  }), /*#__PURE__*/React.createElement("div", null, "\xA9 2026 Sighthound, Inc. \xA0\xB7\xA0 Privacy Policy \xA0\xB7\xA0 Terms of Use")));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/Hero.jsx
try { (() => {
function Hero() {
  const events = [{
    t: '09:42:18',
    plate: '7ABC123',
    make: 'Tesla',
    model: 'Model 3',
    color: 'White',
    region: 'CA'
  }, {
    t: '09:42:15',
    plate: '4XKD891',
    make: 'Ford',
    model: 'F-150',
    color: 'Silver',
    region: 'NV'
  }, {
    t: '09:42:11',
    plate: '8RTL204',
    make: 'Toyota',
    model: 'Camry',
    color: 'Black',
    region: 'CA'
  }, {
    t: '09:42:07',
    plate: '2GHM559',
    make: 'Honda',
    model: 'CR-V',
    color: 'Blue',
    region: 'AZ'
  }, {
    t: '09:42:03',
    plate: '9PLN710',
    make: 'BMW',
    model: 'X5',
    color: 'Gray',
    region: 'CA'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "sh-soft-mist",
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sh-pattern-detect",
    style: {
      position: 'absolute',
      inset: 0,
      opacity: .5,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 1240,
      margin: '0 auto',
      padding: '96px 32px 120px',
      display: 'grid',
      gridTemplateColumns: '1.15fr 1fr',
      gap: 64,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      marginBottom: 16,
      color: '#4f60dc'
    }
  }, "Vehicle & Pedestrian Insights, Made Easy"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 60,
      lineHeight: 1.05,
      margin: '0 0 20px',
      letterSpacing: '-0.015em'
    }
  }, "Turning sight into ", /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'linear-gradient(120deg,#4f60dc 20%,#f62470)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    }
  }, "insight"), "."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 19,
      color: '#4b4f73',
      maxWidth: 560,
      marginBottom: 32,
      fontWeight: 400
    }
  }, "Edge AI cameras and computer-vision software that turn every camera into a real-time data source \u2014 for traffic, smart cities, and enterprise."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, "Talk to our team"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-tertiary"
  }, "See how it works \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      marginTop: 36,
      paddingTop: 24,
      borderTop: '1px solid #e4e8ef'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      fontWeight: 600
    }
  }, "Accuracy"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 500,
      color: '#1a1d38',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "99.4%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      fontWeight: 600
    }
  }, "Edge latency"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 500,
      color: '#1a1d38',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "< 40 ms")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      fontWeight: 600
    }
  }, "Made in USA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 500,
      color: '#1a1d38'
    }
  }, "Always")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 18,
      border: '1px solid #e4e8ef',
      boxShadow: '0 20px 40px rgba(26,29,56,.14)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 18px',
      borderBottom: '1px solid #eef1fc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: '#1f9d55',
      boxShadow: '0 0 0 4px rgba(31,157,85,.18)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#1a1d38'
    }
  }, "Live \xB7 ALPR+ stream")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "Site 02 \xB7 Lane 3")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 4px 14px'
    }
  }, events.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: '70px 1fr auto',
      gap: 12,
      alignItems: 'center',
      padding: '10px 18px',
      borderTop: i ? '1px solid #f4f6fa' : 0,
      opacity: 1 - i * 0.13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a',
      fontFamily: 'SF Mono, Menlo, monospace'
    }
  }, e.t), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      background: '#1a1d38',
      color: '#fff',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '.04em',
      fontFamily: 'SF Mono, Menlo, monospace'
    }
  }, e.region, " \xB7 ", e.plate)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#4b4f73',
      marginTop: 3
    }
  }, e.color, " ", e.make, " ", e.model)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: i === 0 ? '#4f60dc' : '#dee2f8'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 18px',
      borderTop: '1px solid #eef1fc',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11,
      color: '#64708a'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Detection rate \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#1a1d38',
      fontWeight: 500
    }
  }, "14.3 / min")), /*#__PURE__*/React.createElement("span", null, "Confidence \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#1a1d38',
      fontWeight: 500
    }
  }, "0.97 avg")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -14,
      right: -14,
      padding: '8px 14px',
      background: 'linear-gradient(135deg,#4f60dc,#f62470)',
      color: '#fff',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      boxShadow: '0 10px 24px rgba(79,96,220,.35)'
    }
  }, "\u2197 4.2% vs yesterday"))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/Marquee.jsx
try { (() => {
function Marquee() {
  const items = ['Industry-Leading Accuracy', 'Comprehensive Vehicle Analytics', 'Flexible Deployment Options', 'Seamless Integration', 'Real-Time Processing', 'Scalable and Customizable', 'Secure and Compliant', 'Proven Track Record', 'Innovative AI-Driven Technology', 'Global Support and Expertise'];
  const row = [...items, ...items];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#1a1d38',
      color: '#fff',
      padding: '28px 0',
      overflow: 'hidden',
      borderTop: '1px solid #2a2e56',
      borderBottom: '1px solid #2a2e56'
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes mq { from { transform: translateX(0) } to { transform: translateX(-50%) } }`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 56,
      animation: 'mq 60s linear infinite',
      whiteSpace: 'nowrap',
      width: 'max-content'
    }
  }, row.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontFamily: 'Lexend',
      fontWeight: 300,
      fontSize: 22,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 56
    }
  }, t, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#f99f25'
    }
  }, "\u2022")))));
}
window.Marquee = Marquee;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/Marquee.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/Nav.jsx
try { (() => {
const {
  useState
} = React;
function Nav() {
  const [open, setOpen] = useState(null);
  const menus = {
    Products: ['Sighthound ALPR+', 'Sighthound Redactor', 'Sighthound Hardware', 'Sighthound Video'],
    Solutions: ['Parking & EV', 'Law Enforcement', 'Retail & QSR', 'Education & Campus Security', 'Legal & FOIA', 'Transportation & Logistics'],
    Support: ['Frequently Asked Questions', 'Developer Resources'],
    About: ['Team', 'Technology', 'Partners', 'Careers', 'News', 'Blog']
  };
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#fff',
      borderBottom: '1px solid #e4e8ef'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/sighthound-logo-horizontal.jpg",
    style: {
      height: 40
    },
    alt: "Sighthound"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      flex: 1
    },
    onMouseLeave: () => setOpen(null)
  }, Object.keys(menus).map(k => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      position: 'relative'
    },
    onMouseEnter: () => setOpen(k)
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: 0,
      padding: '10px 14px',
      fontFamily: 'Lexend',
      fontWeight: 300,
      fontSize: 15,
      color: '#1a1d38',
      cursor: 'pointer'
    }
  }, k), open === k && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      background: '#fff',
      border: '1px solid #e4e8ef',
      borderRadius: 12,
      boxShadow: '0 8px 20px rgba(26,29,56,.10)',
      padding: 8,
      minWidth: 240
    }
  }, menus[k].map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      display: 'block',
      padding: '10px 14px',
      fontSize: 14,
      color: '#1a1d38',
      textDecoration: 'none',
      borderRadius: 8,
      fontWeight: 300
    },
    onMouseEnter: e => e.currentTarget.style.background = '#eff3f7',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, i)))))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'Lexend',
      fontWeight: 300,
      fontSize: 15,
      color: '#1a1d38',
      textDecoration: 'none'
    }
  }, "Contact"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      padding: '12px 22px'
    }
  }, "Talk to our team")));
}
window.Nav = Nav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/ProductSpotlight.jsx
try { (() => {
function ProductSpotlight() {
  const products = [{
    tag: 'Software · ALPR+',
    title: 'Sighthound ALPR+',
    body: 'License-plate recognition plus full vehicle make / model / color / generation. Read most plates worldwide.',
    img: '../../assets/white-tesla-alpr.jpg',
    cta: 'Explore ALPR+'
  }, {
    tag: 'Software · Redactor',
    title: 'Sighthound Redactor',
    body: 'AI redaction for video, image and audio. Faces, plates and PII — gone in one pass. FOIA-ready.',
    img: '../../assets/redactor-courtroom-redacted.avif',
    cta: 'Explore Redactor'
  }, {
    tag: 'Hardware · Edge Compute',
    title: 'Sighthound Edge Compute',
    body: 'Rugged IP67 deep-learning cameras and nodes. American IP and manufacturing. Software-defined.',
    img: '../../assets/edge-ai-hardware.png',
    cta: 'Explore Edge Compute',
    contain: true
  }, {
    tag: 'Software · Video',
    title: 'Sighthound Video',
    body: 'Flexible video management system — the original Sighthound product. Camera-agnostic, scriptable.',
    img: '../../assets/hero-object-tracking.jpg',
    cta: 'Explore Video'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '112px 32px',
      background: '#eff3f7'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 48,
      flexWrap: 'wrap',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      marginBottom: 12
    }
  }, "The product family"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 44,
      lineHeight: 1.1,
      marginBottom: 0
    }
  }, "One brand. Four products. Software and hardware that fit together.")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: '#4f60dc',
      textDecoration: 'none',
      whiteSpace: 'nowrap'
    }
  }, "Compare all \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20
    }
  }, products.map(p => /*#__PURE__*/React.createElement("article", {
    key: p.title,
    style: {
      background: '#fff',
      borderRadius: 18,
      overflow: 'hidden',
      border: '1px solid #e4e8ef',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '16/9',
      background: p.contain ? 'linear-gradient(180deg,#eff3f7,#fff)' : '#1a1d38',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: p.img,
    style: {
      width: '100%',
      height: '100%',
      objectFit: p.contain ? 'contain' : 'cover',
      padding: p.contain ? '24px' : 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 28px 28px',
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      marginBottom: 10,
      color: '#4f60dc'
    }
  }, p.tag), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 24,
      fontWeight: 500,
      color: '#1a1d38',
      marginBottom: 10,
      lineHeight: 1.2
    }
  }, p.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      color: '#4b4f73',
      lineHeight: 1.55,
      marginBottom: 18,
      flex: 1
    }
  }, p.body), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: '#4f60dc',
      textDecoration: 'none'
    }
  }, p.cta, " \u2192")))))));
}
window.ProductSpotlight = ProductSpotlight;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/ProductSpotlight.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/Schematic.jsx
try { (() => {
function Schematic() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '112px 32px',
      background: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sh-pattern-topo",
    style: {
      position: 'absolute',
      inset: 0,
      opacity: .6,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 1240,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.4fr',
      gap: 64,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      marginBottom: 12
    }
  }, "How it deploys"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 40,
      lineHeight: 1.1,
      marginBottom: 18
    }
  }, "Edge-first. Cloud-optional. Your environment, your data."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: '#4b4f73',
      lineHeight: 1.6,
      marginBottom: 24,
      fontWeight: 400
    }
  }, "Run detection on a Sighthound device at the source, or stream RTSP from existing cameras into a Sighthound Node. Results land in your VMS, ITS, parking system or data warehouse \u2014 no Sighthound cloud required."), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("li", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      fontSize: 14,
      color: '#1a1d38'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#1f9d55',
      fontWeight: 600,
      marginTop: 2
    }
  }, "\u2713"), " Runs on-prem, in your VPC, or air-gapped"), /*#__PURE__*/React.createElement("li", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      fontSize: 14,
      color: '#1a1d38'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#1f9d55',
      fontWeight: 600,
      marginTop: 2
    }
  }, "\u2713"), " REST, MQTT, Webhook and direct DB integrations"), /*#__PURE__*/React.createElement("li", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      fontSize: 14,
      color: '#1a1d38'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#1f9d55',
      fontWeight: 600,
      marginTop: 2
    }
  }, "\u2713"), " Hardware optional \u2014 bring your own GPU if you prefer"), /*#__PURE__*/React.createElement("li", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      fontSize: 14,
      color: '#1a1d38'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#1f9d55',
      fontWeight: 600,
      marginTop: 2
    }
  }, "\u2713"), " Software-defined \u2014 same model, any deployment shape"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e4e8ef',
      borderRadius: 18,
      padding: '32px 28px',
      boxShadow: '0 8px 20px rgba(26,29,56,.06)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 600 360",
    width: "100%",
    preserveAspectRatio: "xMidYMid meet"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("marker", {
    id: "ah",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "6",
    markerHeight: "6",
    orient: "auto"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,0 L10,5 L0,10 z",
    fill: "#4f60dc"
  }))), /*#__PURE__*/React.createElement("g", {
    fontFamily: "Lexend",
    fontSize: "10",
    fill: "#9aa3b2",
    fontWeight: "600",
    letterSpacing: "1"
  }, /*#__PURE__*/React.createElement("text", {
    x: "20",
    y: "22",
    textTransform: "uppercase"
  }, "EDGE"), /*#__PURE__*/React.createElement("text", {
    x: "245",
    y: "22",
    textTransform: "uppercase"
  }, "SIGHTHOUND"), /*#__PURE__*/React.createElement("text", {
    x: "470",
    y: "22",
    textTransform: "uppercase"
  }, "YOUR SYSTEMS")), /*#__PURE__*/React.createElement("g", {
    stroke: "#e4e8ef",
    strokeDasharray: "2 4"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "220",
    y1: "40",
    x2: "220",
    y2: "340"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "455",
    y1: "40",
    x2: "455",
    y2: "340"
  })), /*#__PURE__*/React.createElement("g", {
    stroke: "#4f60dc",
    strokeWidth: "1.7",
    fill: "none",
    markerEnd: "url(#ah)"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "150",
    y1: "80",
    x2: "270",
    y2: "155"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "150",
    y1: "180",
    x2: "270",
    y2: "170"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "150",
    y1: "280",
    x2: "270",
    y2: "195"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "400",
    y1: "180",
    x2: "490",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "400",
    y1: "180",
    x2: "490",
    y2: "180"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "400",
    y1: "180",
    x2: "490",
    y2: "260"
  })), /*#__PURE__*/React.createElement("g", {
    fontFamily: "Lexend",
    fontSize: "12"
  }, /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "20",
    y: "55",
    width: "130",
    height: "50",
    rx: "10",
    fill: "#fff",
    stroke: "#1a1d38",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "78",
    fill: "#1a1d38",
    fontWeight: "500"
  }, "Edge camera"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "95",
    fill: "#64708a",
    fontSize: "10.5"
  }, "Sighthound Compute")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "20",
    y: "155",
    width: "130",
    height: "50",
    rx: "10",
    fill: "#fff",
    stroke: "#1a1d38",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "178",
    fill: "#1a1d38",
    fontWeight: "500"
  }, "IP camera"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "195",
    fill: "#64708a",
    fontSize: "10.5"
  }, "via RTSP")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "20",
    y: "255",
    width: "130",
    height: "50",
    rx: "10",
    fill: "#fff",
    stroke: "#1a1d38",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "278",
    fill: "#1a1d38",
    fontWeight: "500"
  }, "Body / dash cam"), /*#__PURE__*/React.createElement("text", {
    x: "32",
    y: "295",
    fill: "#64708a",
    fontSize: "10.5"
  }, "mobile capture")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "270",
    y: "135",
    width: "135",
    height: "90",
    rx: "12",
    fill: "#eef1fc",
    stroke: "#4f60dc",
    strokeWidth: "1.7"
  }), /*#__PURE__*/React.createElement("text", {
    x: "285",
    y: "160",
    fill: "#1a1d38",
    fontWeight: "500"
  }, "Sighthound Node"), /*#__PURE__*/React.createElement("text", {
    x: "285",
    y: "178",
    fill: "#4b4f73",
    fontSize: "10.5"
  }, "Detection"), /*#__PURE__*/React.createElement("text", {
    x: "285",
    y: "194",
    fill: "#4b4f73",
    fontSize: "10.5"
  }, "MMCG \xB7 OCR"), /*#__PURE__*/React.createElement("text", {
    x: "285",
    y: "210",
    fill: "#4b4f73",
    fontSize: "10.5"
  }, "Redaction")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "490",
    y: "75",
    width: "100",
    height: "50",
    rx: "10",
    fill: "#fff",
    stroke: "#1a1d38",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "502",
    y: "98",
    fill: "#1a1d38",
    fontWeight: "500"
  }, "VMS"), /*#__PURE__*/React.createElement("text", {
    x: "502",
    y: "115",
    fill: "#64708a",
    fontSize: "10.5"
  }, "Existing video")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "490",
    y: "155",
    width: "100",
    height: "50",
    rx: "10",
    fill: "#fff",
    stroke: "#1a1d38",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "502",
    y: "178",
    fill: "#1a1d38",
    fontWeight: "500"
  }, "ITS / parking"), /*#__PURE__*/React.createElement("text", {
    x: "502",
    y: "195",
    fill: "#64708a",
    fontSize: "10.5"
  }, "Webhook \xB7 MQTT")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "490",
    y: "235",
    width: "100",
    height: "50",
    rx: "10",
    fill: "#fff",
    stroke: "#1a1d38",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "502",
    y: "258",
    fill: "#1a1d38",
    fontWeight: "500"
  }, "Data lake"), /*#__PURE__*/React.createElement("text", {
    x: "502",
    y: "275",
    fill: "#64708a",
    fontSize: "10.5"
  }, "REST / S3"))))))));
}
window.Schematic = Schematic;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/Schematic.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sighthound-marketing/Stats.jsx
try { (() => {
function Stats() {
  const kpis = [{
    l: 'Deployments',
    v: '2,800+',
    s: 'in 47 countries'
  }, {
    l: 'Cameras online',
    v: '190K',
    s: 'streaming today'
  }, {
    l: 'Plates / second',
    v: '160',
    s: 'on a single GPU'
  }, {
    l: 'Latency',
    v: '< 40 ms',
    s: 'at the edge'
  }];
  const spark = [40, 32, 38, 22, 28, 18, 24, 14, 20, 12, 16, 8, 12, 10];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '112px 32px',
      background: '#1a1d38',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sh-pattern-scan",
    style: {
      position: 'absolute',
      inset: 0,
      opacity: .6,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 1240,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 80,
      alignItems: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      marginBottom: 12,
      color: '#8792e8'
    }
  }, "By the numbers"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 44,
      lineHeight: 1.1,
      color: '#fff',
      margin: 0
    }
  }, "The world's busiest roads, made legible in real time.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: '#dee2f8',
      lineHeight: 1.6,
      fontWeight: 400
    }
  }, "Sighthound is deployed by government agencies, fleet operators and Fortune-500 enterprises. The numbers below are not aspirational \u2014 they're current as of this quarter.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 20,
      marginBottom: 32
    }
  }, kpis.map(k => /*#__PURE__*/React.createElement("div", {
    key: k.l,
    style: {
      padding: '24px 22px',
      background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(135,146,232,.18)',
      borderRadius: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      color: '#8792e8',
      marginBottom: 10
    }
  }, k.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 500,
      color: '#fff',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1,
      marginBottom: 6
    }
  }, k.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#dee2f8'
    }
  }, k.s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 26px',
      background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(135,146,232,.18)',
      borderRadius: 14,
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: 32,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      color: '#8792e8',
      marginBottom: 8
    }
  }, "Detections \xB7 last 24 h"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 500,
      color: '#fff',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "12.4M"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#1f9d55',
      marginTop: 4
    }
  }, "\u2191 4.2% vs yesterday")), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 600 70",
    width: "100%",
    height: "70",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "sg",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#4f60dc",
    stopOpacity: ".5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#4f60dc",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("polyline", {
    fill: "none",
    stroke: "#4f60dc",
    strokeWidth: "2.2",
    points: spark.map((y, i) => `${i * (600 / (spark.length - 1))},${y + 8}`).join(' ')
  }), /*#__PURE__*/React.createElement("polyline", {
    fill: "url(#sg)",
    stroke: "none",
    points: spark.map((y, i) => `${i * (600 / (spark.length - 1))},${y + 8}`).join(' ') + ` 600,70 0,70`
  })))));
}
window.Stats = Stats;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sighthound-marketing/Stats.jsx", error: String((e && e.message) || e) }); }

// ui_kits/video-app/CameraGrid.jsx
try { (() => {
const CAMERAS = [{
  id: 'c01',
  name: '01 · Loading Bay',
  src: '../../assets/hero-vehicle-detection.jpg',
  status: 'rec',
  bbox: [{
    x: 38,
    y: 48,
    w: 26,
    h: 34,
    label: 'VEHICLE · 96%',
    c: '#4f60dc'
  }]
}, {
  id: 'c02',
  name: '02 · Entry Gate',
  src: '../../assets/white-tesla-alpr.jpg',
  status: 'rec',
  bbox: [{
    x: 30,
    y: 38,
    w: 42,
    h: 36,
    label: 'VEHICLE · 98%',
    c: '#4f60dc'
  }, {
    x: 46,
    y: 62,
    w: 18,
    h: 6,
    label: 'PLATE',
    c: '#f99f25'
  }]
}, {
  id: 'c03',
  name: '03 · South Entrance',
  src: '../../assets/redactor-crosswalk.avif',
  status: 'motion',
  bbox: [{
    x: 42,
    y: 50,
    w: 8,
    h: 24,
    label: 'PERSON · 91%',
    c: '#f99f25'
  }]
}, {
  id: 'c04',
  name: '04 · North Yard',
  src: '../../assets/redactor-cars-tolls.avif',
  status: 'rec',
  bbox: []
}, {
  id: 'c05',
  name: '05 · Perimeter West',
  src: '../../assets/redactor-traffic.avif',
  status: 'rec',
  bbox: []
}, {
  id: 'c06',
  name: '06 · Warehouse Floor',
  src: '../../assets/hero-object-tracking.jpg',
  status: 'rec',
  bbox: [{
    x: 34,
    y: 42,
    w: 20,
    h: 42,
    label: 'PERSON · 94%',
    c: '#4f60dc'
  }]
}];
window.VIDEO_CAMERAS = CAMERAS;
function CameraTile({
  cam,
  active,
  onSelect,
  t
}) {
  const statusMap = {
    rec: {
      l: 'REC',
      fg: '#fff',
      bg: '#f62470',
      dot: '#f62470'
    },
    motion: {
      l: 'MOTION',
      fg: '#1a1d38',
      bg: '#f99f25',
      dot: '#f99f25'
    },
    offline: {
      l: 'OFFLINE',
      fg: '#1a1d38',
      bg: '#d9dfe6',
      dot: '#9aa3b2'
    }
  };
  const s = statusMap[cam.status];
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onSelect(cam.id),
    style: {
      position: 'relative',
      background: '#1a1d38',
      borderRadius: 12,
      overflow: 'hidden',
      cursor: 'pointer',
      padding: 0,
      border: '2px solid ' + (active ? '#4f60dc' : 'transparent'),
      boxShadow: active ? '0 0 0 4px rgba(79,96,220,.18)' : 'none',
      aspectRatio: '16/9'
    }
  }, cam.src ? /*#__PURE__*/React.createElement("img", {
    src: cam.src,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: .94
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "sh-pattern-scan",
    style: {
      width: '100%',
      height: '100%',
      background: '#1a1d38'
    }
  }), cam.bbox && cam.bbox.length > 0 && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    }
  }, cam.bbox.map((b, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("rect", {
    x: b.x,
    y: b.y,
    width: b.w,
    height: b.h,
    fill: "none",
    stroke: b.c,
    strokeWidth: "0.4",
    vectorEffect: "non-scaling-stroke"
  })))), cam.bbox && cam.bbox.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none'
    }
  }, cam.bbox.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      left: b.x + '%',
      top: b.y - 4 + '%',
      padding: '1px 5px',
      background: b.c,
      color: b.c === '#f99f25' ? '#1a1d38' : '#fff',
      fontSize: 8,
      fontWeight: 600,
      fontFamily: 'SF Mono, Menlo, monospace',
      letterSpacing: '.04em',
      borderRadius: 2
    }
  }, b.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      left: 8,
      padding: '3px 8px',
      background: 'rgba(26,29,56,.72)',
      color: '#fff',
      fontSize: 11,
      fontWeight: 500,
      borderRadius: 6,
      backdropFilter: 'blur(4px)'
    }
  }, cam.name), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 8,
      right: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 8px',
      background: s.bg,
      color: s.fg,
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 6,
      letterSpacing: '.06em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 999,
      background: s.dot,
      boxShadow: `0 0 0 3px ${s.dot}33`,
      animation: cam.status === 'rec' ? 'pulse 1.6s infinite' : 'none'
    }
  }), s.l), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      right: 8,
      display: 'flex',
      justifyContent: 'space-between',
      color: '#fff',
      fontFamily: 'SF Mono, Menlo, monospace',
      fontSize: 10,
      textShadow: '0 1px 2px rgba(0,0,0,.6)'
    }
  }, /*#__PURE__*/React.createElement("span", null, t), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .7
    }
  }, "F#", cam.id.replace('c', '') * 10000 + 2914 | 0)));
}
function CameraGrid({
  activeId,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '14px 18px 0',
      minHeight: 0,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 10
    }
  }, CAMERAS.map(c => /*#__PURE__*/React.createElement(CameraTile, {
    key: c.id,
    cam: c,
    active: c.id === activeId,
    onSelect: onSelect,
    t: "14:32:18"
  }))));
}
window.VideoCameraGrid = CameraGrid;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/video-app/CameraGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/video-app/EventsPanel.jsx
try { (() => {
function EventsPanel() {
  const events = [{
    t: '14:32:18',
    cam: '03',
    type: 'motion',
    label: 'Motion detected',
    tag: null
  }, {
    t: '14:31:45',
    cam: '01',
    type: 'vehicle',
    label: 'Vehicle · White Tesla M3',
    tag: null
  }, {
    t: '14:30:12',
    cam: '02',
    type: 'plate',
    label: 'NV-4XKD891 read',
    tag: null
  }, {
    t: '14:28:55',
    cam: '06',
    type: 'person',
    label: 'Person · Bay 6 west',
    tag: null
  }, {
    t: '14:25:30',
    cam: '03',
    type: 'person',
    label: 'Person enters site',
    tag: 'follow-up'
  }, {
    t: '14:22:18',
    cam: '04',
    type: 'motion',
    label: 'Motion · loading deck',
    tag: null
  }, {
    t: '14:19:02',
    cam: '01',
    type: 'vehicle',
    label: 'Vehicle · Ford F-150',
    tag: null
  }, {
    t: '14:15:48',
    cam: '06',
    type: 'motion',
    label: 'Motion detected',
    tag: null
  }, {
    t: '14:11:22',
    cam: '02',
    type: 'plate',
    label: 'CA-7ABC123 read',
    tag: null
  }];
  const iconFor = t => ({
    motion: {
      d: 'M3 12h4l2-6 4 12 2-6h4',
      c: '#8792e8'
    },
    vehicle: {
      d: 'M3 13l1.5-5h11L17 13 M3 13h14v5H3z M6 18v2 M14 18v2',
      c: '#4f60dc'
    },
    plate: {
      d: 'M3 6h18v12H3z M6 9h12 M6 12h12 M6 15h8',
      c: '#f99f25'
    },
    person: {
      d: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z',
      c: '#4f60dc'
    }
  })[t];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 320,
      background: '#fff',
      borderLeft: '1px solid #e4e8ef',
      padding: 0,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Lexend'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 18px 12px',
      borderBottom: '1px solid #eef1fc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      marginBottom: 10
    }
  }, "Today's activity"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, [['Events', 128, '#1a1d38'], ['Motion', 96, '#8792e8'], ['Vehicles', 18, '#4f60dc'], ['Alerts', 2, '#f62470']].map(([l, n, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      padding: 10,
      background: '#f6f8fb',
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 500,
      color: c,
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64708a',
      marginTop: 4
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px 10px',
      borderBottom: '1px solid #eef1fc',
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, [['All', true], ['Motion', false], ['Vehicle', false], ['Plate', false], ['Person', false]].map(([l, a]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    style: {
      padding: '4px 10px',
      fontSize: 11,
      fontWeight: 500,
      borderRadius: 999,
      background: a ? '#eef1fc' : '#fff',
      color: a ? '#2e3ba4' : '#64708a',
      border: '1px solid ' + (a ? '#dee2f8' : '#e4e8ef')
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px 14px',
      flex: 1
    }
  }, events.map((e, i) => {
    const icon = iconFor(e.type);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 10,
        padding: '10px',
        borderRadius: 8,
        alignItems: 'flex-start',
        cursor: 'pointer'
      },
      onMouseEnter: ev => ev.currentTarget.style.background = '#f6f8fb',
      onMouseLeave: ev => ev.currentTarget.style.background = 'transparent'
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        background: '#f6f8fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: icon.c,
      strokeWidth: "1.75",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: icon.d
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: '#1a1d38',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", null, e.label), e.tag && /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '1px 7px',
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        borderRadius: 999,
        background: '#fef4e0',
        color: '#f05d22'
      }
    }, e.tag)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#64708a',
        marginTop: 2,
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'SF Mono, Menlo, monospace',
        fontVariantNumeric: 'tabular-nums'
      }
    }, e.t), /*#__PURE__*/React.createElement("span", null, "\xB7 Camera ", e.cam))));
  })));
}
window.VideoEventsPanel = EventsPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/video-app/EventsPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/video-app/Timeline.jsx
try { (() => {
function Timeline() {
  // 4-hour scale, motion bands per camera. Each band: array of [startPct, widthPct, type]
  const cams = [{
    id: '01',
    bands: [[3, 8, 'm'], [22, 4, 'v'], [42, 12, 'm'], [78, 3, 'v']]
  }, {
    id: '02',
    bands: [[10, 3, 'p'], [38, 5, 'p'], [60, 6, 'p'], [85, 4, 'p']]
  }, {
    id: '03',
    bands: [[0, 11, 'm'], [18, 7, 'm'], [50, 10, 'm'], [70, 15, 'm'], [92, 6, 'm']]
  }, {
    id: '04',
    bands: [[28, 3, 'v'], [56, 2, 'v'], [80, 4, 'v']]
  }, {
    id: '05',
    bands: [[12, 2, 'm'], [44, 3, 'm'], [76, 3, 'm']]
  }, {
    id: '06',
    bands: [[5, 10, 'm'], [30, 6, 'm'], [58, 8, 'm'], [88, 4, 'm']]
  }];
  const colorFor = t => t === 'v' ? '#4f60dc' : t === 'p' ? '#f99f25' : '#8792e8';
  const hours = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '12px 18px 16px',
      background: '#fff',
      borderTop: '1px solid #e4e8ef'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#64708a',
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Timeline \xB7 past 4 h"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      fontSize: 11,
      color: '#4b4f73'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: '#8792e8'
    }
  }), "Motion"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: '#4f60dc'
    }
  }), "Vehicle"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: '#f99f25'
    }
  }), "Plate"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingLeft: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      bottom: 18,
      right: 0,
      width: 2,
      background: '#4f60dc',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -4,
      right: -5,
      width: 12,
      height: 12,
      borderRadius: 999,
      background: '#4f60dc',
      boxShadow: '0 0 0 4px rgba(79,96,220,.2)'
    }
  })), cams.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      fontSize: 10,
      color: '#64708a',
      fontFamily: 'SF Mono, Menlo, monospace',
      width: 20,
      textAlign: 'right'
    }
  }, c.id), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 10,
      background: '#f6f8fb',
      borderRadius: 3,
      position: 'relative'
    }
  }, c.bands.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      left: b[0] + '%',
      width: b[1] + '%',
      top: 0,
      bottom: 0,
      background: colorFor(b[2]),
      borderRadius: 2
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 6,
      fontSize: 9,
      color: '#9aa3b2',
      fontFamily: 'SF Mono, Menlo, monospace',
      fontVariantNumeric: 'tabular-nums'
    }
  }, hours.map(h => /*#__PURE__*/React.createElement("span", {
    key: h
  }, h)))));
}
window.VideoTimeline = Timeline;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/video-app/Timeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/video-app/VideoShell.jsx
try { (() => {
const {
  useState
} = React;
function VideoAppShell({
  children
}) {
  const nav = [{
    k: 'live',
    l: 'Live monitoring',
    i: 'M3 12h4l2-6 4 12 2-6h4 M21 12h-2'
  }, {
    k: 'cameras',
    l: 'Cameras',
    i: 'M3 7l3-3h12l3 3v12H3z M12 11a3 3 0 100 6 3 3 0 000-6z',
    count: 14
  }, {
    k: 'recordings',
    l: 'Recordings',
    i: 'M3 4h18v16H3z M3 8h18 M7 4v16'
  }, {
    k: 'events',
    l: 'Events',
    i: 'M12 9v4 M12 17h.01 M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    count: 23
  }, {
    k: 'schedules',
    l: 'Schedules',
    i: 'M3 7h18 M3 12h18 M3 17h18 M7 3v4 M17 3v4'
  }, {
    k: 'users',
    l: 'Users & access',
    i: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75'
  }, {
    k: 'settings',
    l: 'Settings',
    i: 'M12 8a4 4 0 100 8 4 4 0 000-8z M19 12a7 7 0 00-.2-1.7l2-1.5-2-3.4-2.3.9a7 7 0 00-3-1.7L13 2h-2l-.5 2.6a7 7 0 00-3 1.7l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-.9a7 7 0 003 1.7L11 22h2l.5-2.6a7 7 0 003-1.7l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z'
  }];
  const [active, setActive] = useState('live');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      height: '100vh',
      background: '#f6f8fb',
      fontFamily: 'Lexend',
      fontWeight: 400,
      color: '#1a1d38'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      background: '#1a1d38',
      color: '#fff',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 8px 12px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/sighthound-logo-white.png",
    style: {
      height: 30
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 8px 18px',
      borderBottom: '1px solid #2a2e56',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#8792e8',
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Video"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#dee2f8',
      marginTop: 2
    }
  }, "Mercer Logistics")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      flex: 1
    }
  }, nav.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.k,
    onClick: () => setActive(n.k),
    style: {
      textAlign: 'left',
      background: active === n.k ? '#2a2e56' : 'transparent',
      border: 0,
      color: active === n.k ? '#fff' : '#dee2f8',
      fontFamily: 'Lexend',
      fontSize: 14,
      fontWeight: 400,
      padding: '10px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: n.i
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, n.l), n.count !== undefined && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '1px 7px',
      borderRadius: 999,
      background: 'rgba(135,146,232,.2)',
      color: '#dee2f8',
      fontWeight: 600
    }
  }, n.count)))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid #2a2e56',
      paddingTop: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 999,
      background: 'linear-gradient(135deg,#4f60dc,#f99f25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600,
      color: '#fff'
    }
  }, "DP"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, "D. Patel"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#8792e8',
      fontSize: 11
    }
  }, "Security Ops")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, children));
}
function VideoTopBar({
  layout,
  onLayout
}) {
  const opts = [{
    k: 'grid',
    i: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'
  }, {
    k: 'focus',
    i: 'M3 3h18v18H3z'
  }, {
    k: 'list',
    i: 'M3 5h18 M3 12h18 M3 19h18'
  }];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: '#fff',
      borderBottom: '1px solid #e4e8ef',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 500,
      color: '#1a1d38'
    }
  }, "Live monitoring"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64708a'
    }
  }, "Mercer Logistics \xB7 West Yard")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: '#e7f4ed',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      color: '#1f9d55'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: '#1f9d55',
      boxShadow: '0 0 0 4px rgba(31,157,85,.20)'
    }
  }), "12 / 14 cameras online")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      padding: 3,
      background: '#f6f8fb',
      border: '1px solid #e4e8ef',
      borderRadius: 10
    }
  }, opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.k,
    onClick: () => onLayout(o.k),
    style: {
      padding: '6px 9px',
      border: 0,
      background: layout === o.k ? '#fff' : 'transparent',
      color: layout === o.k ? '#4f60dc' : '#64708a',
      borderRadius: 8,
      cursor: 'pointer',
      boxShadow: layout === o.k ? '0 1px 2px rgba(26,29,56,.06)' : 'none',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75"
  }, /*#__PURE__*/React.createElement("path", {
    d: o.i
  }))))), /*#__PURE__*/React.createElement("button", {
    style: {
      border: '1px solid #d9dfe6',
      background: '#fff',
      padding: '9px 14px',
      borderRadius: 10,
      fontSize: 13,
      color: '#1a1d38',
      cursor: 'pointer'
    }
  }, "Audio off"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: '#4f60dc',
      color: '#fff',
      padding: '9px 16px',
      borderRadius: 10,
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'Lexend',
      fontWeight: 400
    }
  }, "+ Add camera")));
}
window.VideoAppShell = VideoAppShell;
window.VideoTopBar = VideoTopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/video-app/VideoShell.jsx", error: String((e && e.message) || e) }); }

})();
