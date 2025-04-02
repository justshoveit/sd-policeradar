const radarPanel = document.getElementById("radar-panel")
const logPanel = document.getElementById("log-panel")
const boloPanel = document.getElementById("bolo-panel")
const boloModal = document.getElementById("bolo-modal")
const keybindsPanel = document.getElementById("keybinds-panel")
const notification = document.getElementById("notification")
const frontPanel = document.getElementById("front-panel")
const rearPanel = document.getElementById("rear-panel")
const frontSpeed = document.getElementById("front-speed")
const rearSpeed = document.getElementById("rear-speed")
const frontPlate = document.getElementById("front-plate")
const rearPlate = document.getElementById("rear-plate")
const radarTitle = document.getElementById("radar-title")
const logTitle = document.getElementById("log-title")
const boloTitle = document.getElementById("bolo-title")
const radarHint = document.getElementById("radar-hint")
const logEntries = document.getElementById("log-entries")
const logEmpty = document.getElementById("log-empty")
const logPositioningHint = document.getElementById("log-positioning-hint")
const boloEntries = document.getElementById("bolo-entries")
const boloEmpty = document.getElementById("bolo-empty")
const boloPositioningHint = document.getElementById("bolo-positioning-hint")
const boloPlateInput = document.getElementById("bolo-plate-input")
const keybindsBtn = document.getElementById("keybinds-btn")
const positionBtn = document.getElementById("position-btn")
const lockBtn = document.getElementById("lock-btn")
const logBtn = document.getElementById("log-btn")
const boloBtn = document.getElementById("bolo-btn")
const saveBtn = document.getElementById("save-btn")
const logPositionBtn = document.getElementById("log-position-btn")
const boloPositionBtn = document.getElementById("bolo-position-btn")
const closeLogBtn = document.getElementById("close-log-btn")
const closeBoloBtnPanel = document.getElementById("close-bolo-btn")
const addBoloPlateBtn = document.getElementById("add-bolo-plate-btn")
const closeBoloBtnModal = document.getElementById("close-bolo-modal-btn")
const addBoloBtn = document.getElementById("add-bolo-btn")

const state = {
  frontSpeed: 0,
  rearSpeed: 0,
  frontPlate: "",
  rearPlate: "",
  isActive: true,
  savedReadings: [],
  boloPlates: [],
  showLog: false,
  showBolo: false,
  selectedDirection: "Front",
  isPositioning: false,
  isLogPositioning: false,
  isBoloPositioning: false,
  showKeybinds: false,
  idCounter: 1,
  boloAlerts: {
    front: false,
    rear: false,
  },
  interactKey: "F6",
  isInteracting: false,
  notificationType: "native",
}

let isDragging = false
let isLogDragging = false
let isBolosDragging = false
let dragOffset = { x: 0, y: 0 }
let logDragOffset = { x: 0, y: 0 }
let boloDragOffset = { x: 0, y: 0 }

function savePositions() {
  const positions = {
    radar: {
      left: radarPanel.style.left,
      top: radarPanel.style.top,
    },
    log: {
      left: logPanel.style.left,
      top: logPanel.style.top,
    },
    bolo: {
      left: boloPanel.style.left,
      top: boloPanel.style.top,
      right: boloPanel.style.right,
    },
  }

  fetch("https://sd-policeradar/savePositions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(positions),
  }).catch(() => {})
}

function handleMouseUp() {
  if (isDragging || isLogDragging || isBolosDragging) {
    savePositions()
  }

  isDragging = false
  isLogDragging = false
  isBolosDragging = false
  document.body.style.cursor = "default"
}

function init() {
  document.body.style.display = "none"
  const radarWidth = 288,
    radarHeight = 300,
    logWidth = 320,
    boloWidth = 280

  radarPanel.style.left = `${Math.max(0, (window.innerWidth - radarWidth) / 2)}px`
  radarPanel.style.top = `${Math.max(0, (window.innerHeight - radarHeight) / 2)}px`
  radarPanel.style.transform = "none"
  logPanel.style.left = `${Math.max(0, (window.innerWidth - radarWidth) / 2 - logWidth - 20)}px`
  logPanel.style.top = `${Math.max(0, (window.innerHeight - radarHeight) / 2)}px`
  boloPanel.style.right = "20px"
  boloPanel.style.top = "20px"

  setupEventListeners()
  selectDirection("Front")
}

function applyPositions(positions) {
  if (!positions) return

  if (positions.radar) {
    if (positions.radar.left) radarPanel.style.left = positions.radar.left
    if (positions.radar.top) radarPanel.style.top = positions.radar.top
  }

  if (positions.log) {
    if (positions.log.left) logPanel.style.left = positions.log.left
    if (positions.log.top) logPanel.style.top = positions.log.top
  }

  if (positions.bolo) {
    if (positions.bolo.left) {
      boloPanel.style.left = positions.bolo.left
      boloPanel.style.right = "auto"
    } else if (positions.bolo.right) {
      boloPanel.style.right = positions.bolo.right
    }
    if (positions.bolo.top) boloPanel.style.top = positions.bolo.top
  }
}

function setupEventListeners() {
  keybindsBtn.addEventListener("click", toggleKeybinds)
  positionBtn.addEventListener("click", togglePositioning)
  lockBtn.addEventListener("click", toggleRadar)
  logBtn.addEventListener("click", toggleLog)
  boloBtn.addEventListener("click", toggleBolo)
  saveBtn.addEventListener("click", saveReading)
  logPositionBtn.addEventListener("click", toggleLogPositioning)
  boloPositionBtn.addEventListener("click", toggleBoloPositioning)
  closeLogBtn.addEventListener("click", () => {
    state.showLog = false
    logPanel.classList.add("hidden")
    logBtn.classList.remove("active")
  })
  closeBoloBtnPanel.addEventListener("click", () => {
    state.showBolo = false
    boloPanel.classList.add("hidden")
    boloBtn.classList.remove("active")
  })
  addBoloPlateBtn.addEventListener("click", showBoloModal)
  closeBoloBtnModal.addEventListener("click", hideBoloModal)
  addBoloBtn.addEventListener("click", addBoloPlate)
  frontPanel.addEventListener("click", () => {
    if (!state.isPositioning) {
      selectDirection("Front")
    }
  })
  rearPanel.addEventListener("click", () => {
    if (!state.isPositioning) {
      selectDirection("Rear")
    }
  })
  radarPanel.addEventListener("mousedown", handleRadarMouseDown)
  logPanel.addEventListener("mousedown", handleLogMouseDown)
  boloPanel.addEventListener("mousedown", handleBoloMouseDown)
  document.addEventListener("mousemove", handleMouseMove)
  document.addEventListener("mouseup", handleMouseUp)
  boloPlateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addBoloPlate()
    }
  })
}

function updateUIValues(data) {
  if (state.isActive) {
    if (data.frontSpeed !== undefined) {
      state.frontSpeed = data.frontSpeed
      frontSpeed.textContent = data.frontSpeed
    }
    if (data.rearSpeed !== undefined) {
      state.rearSpeed = data.rearSpeed
      rearSpeed.textContent = data.rearSpeed
    }
    if (data.frontPlate !== undefined) {
      state.frontPlate = data.frontPlate || "--------"
      frontPlate.textContent = state.frontPlate
      checkBoloMatch("front", data.frontPlate)
    }
    if (data.rearPlate !== undefined) {
      state.rearPlate = data.rearPlate || "--------"
      rearPlate.textContent = state.rearPlate
      checkBoloMatch("rear", data.rearPlate)
    }
  }
}

function checkBoloMatch(direction, plate) {
  if (!plate || plate === "--------") {
    if (direction === "front") {
      if (state.boloAlerts.front) {
        frontPanel.querySelector(".plate-box").classList.remove("bolo-alert")
        state.boloAlerts.front = false
      }
    } else {
      if (state.boloAlerts.rear) {
        rearPanel.querySelector(".plate-box").classList.remove("bolo-alert")
        state.boloAlerts.rear = false
      }
    }
    return
  }
  const cleanPlate = plate.trim().toUpperCase()
  const isMatch = state.boloPlates.some((boloPlate) => boloPlate.trim().toUpperCase() === cleanPlate)
  if (isMatch) {
    if (direction === "front") {
      if (!state.boloAlerts.front) {
        const plateBox = frontPanel.querySelector(".plate-box")
        plateBox.classList.add("bolo-alert")
        state.boloAlerts.front = true
        fetch("https://fivem-radar/boloAlert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plate: cleanPlate, direction: "front" }),
        }).catch(() => {})
      }
    } else {
      if (!state.boloAlerts.rear) {
        const plateBox = rearPanel.querySelector(".plate-box")
        plateBox.classList.add("bolo-alert")
        state.boloAlerts.rear = true
        fetch("https://fivem-radar/boloAlert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plate: cleanPlate, direction: "rear" }),
        }).catch(() => {})
      }
    }
  } else {
    if (direction === "front") {
      if (state.boloAlerts.front) {
        frontPanel.querySelector(".plate-box").classList.remove("bolo-alert")
        state.boloAlerts.front = false
      }
    } else {
      if (state.boloAlerts.rear) {
        rearPanel.querySelector(".plate-box").classList.remove("bolo-alert")
        state.boloAlerts.rear = false
      }
    }
  }
}

function handleRadarMouseDown(e) {
  if (!state.isPositioning) return
  isDragging = true
  document.body.style.cursor = "move"
  const rect = radarPanel.getBoundingClientRect()
  dragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  e.preventDefault()
}

function handleLogMouseDown(e) {
  if (!state.isLogPositioning) return
  isLogDragging = true
  document.body.style.cursor = "move"
  const rect = logPanel.getBoundingClientRect()
  logDragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  e.preventDefault()
}

function handleBoloMouseDown(e) {
  if (!state.isBoloPositioning) return
  isBolosDragging = true
  document.body.style.cursor = "move"
  const rect = boloPanel.getBoundingClientRect()
  boloDragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  e.preventDefault()
}

function handleMouseMove(e) {
  if (isDragging) {
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    const maxX = window.innerWidth - radarPanel.offsetWidth
    const maxY = window.innerHeight - radarPanel.offsetHeight
    radarPanel.style.left = `${Math.max(0, Math.min(newX, maxX))}px`
    radarPanel.style.top = `${Math.max(0, Math.min(newY, maxY))}px`
  }
  if (isLogDragging) {
    const newX = e.clientX - logDragOffset.x
    const newY = e.clientY - logDragOffset.y
    const maxX = window.innerWidth - logPanel.offsetWidth
    const maxY = window.innerHeight - logPanel.offsetHeight
    logPanel.style.left = `${Math.max(0, Math.min(newX, maxX))}px`
    logPanel.style.top = `${Math.max(0, Math.min(newY, maxY))}px`
  }
  if (isBolosDragging) {
    const newX = e.clientX - boloDragOffset.x
    const newY = e.clientY - boloDragOffset.y
    const maxX = window.innerWidth - boloPanel.offsetWidth
    const maxY = window.innerHeight - boloPanel.offsetHeight
    boloPanel.style.left = `${Math.max(0, Math.min(newX, maxX))}px`
    boloPanel.style.top = `${Math.max(0, Math.min(newY, maxY))}px`
  }
}

function toggleKeybinds() {
  state.showKeybinds = !state.showKeybinds
  keybindsPanel.classList.toggle("hidden", !state.showKeybinds)
  keybindsBtn.classList.toggle("active", state.showKeybinds)
}

function togglePositioning() {
  state.isPositioning = !state.isPositioning
  if (state.isPositioning) {
    radarPanel.classList.add("positioning")
    radarTitle.textContent = "POSITIONING"
    radarHint.textContent = "Click and drag to reposition"
    positionBtn.classList.add("active")
    if (state.isLogPositioning) {
      toggleLogPositioning()
    }
    if (state.isBoloPositioning) {
      toggleBoloPositioning()
    }
    if (state.showKeybinds) {
      toggleKeybinds()
    }
    showNotification("Click and drag to reposition radar")
  } else {
    radarPanel.classList.remove("positioning")
    radarTitle.textContent = `${state.isActive ? "UNLOCKED" : "LOCKED"}`
    updateDirectionHint()
    positionBtn.classList.remove("active")
    showNotification("Position saved")
  }
}

function toggleLogPositioning() {
  state.isLogPositioning = !state.isLogPositioning
  if (state.isLogPositioning) {
    logPanel.classList.add("positioning")
    logTitle.textContent = "POSITIONING LOG"
    logPositioningHint.classList.remove("hidden")
    logPositionBtn.classList.add("active")
    if (state.isPositioning) {
      togglePositioning()
    }
    if (state.isBoloPositioning) {
      toggleBoloPositioning()
    }
    showNotification("Click and drag to reposition log")
  } else {
    logPanel.classList.remove("positioning")
    logTitle.textContent = "RADAR LOG"
    logPositioningHint.classList.add("hidden")
    logPositionBtn.classList.remove("active")
    showNotification("Log position saved")
  }
}

function toggleBoloPositioning() {
  state.isBoloPositioning = !state.isBoloPositioning
  if (state.isBoloPositioning) {
    boloPanel.classList.add("positioning")
    boloTitle.textContent = "POSITIONING BOLO"
    boloPositioningHint.classList.remove("hidden")
    boloPositionBtn.classList.add("active")
    if (state.isPositioning) {
      togglePositioning()
    }
    if (state.isLogPositioning) {
      toggleLogPositioning()
    }
    showNotification("Click and drag to reposition BOLO list")
  } else {
    boloPanel.classList.remove("positioning")
    boloTitle.textContent = "BOLO PLATES"
    boloPositioningHint.classList.add("hidden")
    boloPositionBtn.classList.remove("active")
    showNotification("BOLO list position saved")
  }
}

function toggleRadar() {
  state.isActive = !state.isActive
  if (state.isActive) {
    lockBtn.innerHTML = '<i class="fa-solid fa-lock"></i>'
  } else {
    lockBtn.innerHTML = '<i class="fa-solid fa-unlock"></i>'
  }
  radarTitle.textContent = `${state.isActive ? "UNLOCKED" : "LOCKED"}`
  showNotification(`Radar ${state.isActive ? "unlocked" : "locked"}`)
}

function toggleLog() {
  state.showLog = !state.showLog
  logPanel.classList.toggle("hidden", !state.showLog)
  logBtn.classList.toggle("active", state.showLog)
  updateLogEntries()
}

function toggleBolo() {
  state.showBolo = !state.showBolo
  boloPanel.classList.toggle("hidden", !state.showBolo)
  boloBtn.classList.toggle("active", state.showBolo)
  updateBoloEntries()
}

function showBoloModal() {
  boloModal.classList.remove("hidden")
  boloPlateInput.value = ""
  boloPlateInput.focus()
}

function hideBoloModal() {
  boloModal.classList.add("hidden")
}

function addBoloPlate() {
  const plate = boloPlateInput.value.trim()
  if (plate) {
    state.boloPlates.push(plate)
    fetch("https://sd-policeradar/addBoloPlate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plate }),
    }).catch(() => {})
    updateBoloEntries()
    hideBoloModal()
    showNotification(`Added BOLO for plate: ${plate}`)
  }
}

function updateBoloEntries() {
  if (state.boloPlates.length > 0) {
    boloEntries.innerHTML = ""
    boloEmpty.classList.add("hidden")
    state.boloPlates.forEach((plate) => {
      const entryElement = document.createElement("div")
      entryElement.className = "bolo-entry"
      entryElement.innerHTML = `
        <div class="bolo-plate">${plate}</div>
        <div class="log-entry-actions">
          <button class="icon-button delete-bolo" data-plate="${plate}" title="Remove BOLO">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `
      boloEntries.appendChild(entryElement)
      const deleteBtn = entryElement.querySelector(".delete-bolo")
      deleteBtn.addEventListener("click", () => {
        removeBoloPlate(plate)
      })
    })
  } else {
    boloEntries.innerHTML = ""
    boloEmpty.classList.remove("hidden")
  }
}

function removeBoloPlate(plate) {
  state.boloPlates = state.boloPlates.filter((p) => p !== plate)
  fetch("https://fivem-radar/removeBoloPlate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plate }),
  }).catch(() => {})
  updateBoloEntries()
  showNotification(`Removed BOLO for plate: ${plate}`)
}

function selectDirection(direction) {
  if (state.selectedDirection === direction) return
  state.selectedDirection = direction
  frontPanel.classList.toggle("selected", direction === "Front")
  rearPanel.classList.toggle("selected", direction === "Rear")
  updateDirectionHint()
  showNotification(`Selected ${direction}`)
}

function updateDirectionHint() {
  if (state.selectedDirection === "Front") {
    radarHint.textContent = "Front selected"
  } else {
    radarHint.textContent = "Rear selected"
  }
}

function saveReading() {
  const now = new Date()
  const timestamp = now.toLocaleTimeString() + " " + now.toLocaleDateString()
  const newReading = {
    id: state.idCounter++,
    timestamp,
    speed: state.selectedDirection === "Front" ? state.frontSpeed : state.rearSpeed,
    plate: state.selectedDirection === "Front" ? state.frontPlate : state.rearPlate,
    direction: state.selectedDirection,
  }
  state.savedReadings.unshift(newReading)
  showNotification(`Saved ${state.selectedDirection} reading`)
  if (state.showLog) {
    updateLogEntries()
  }
}

function updateLogEntries() {
  if (state.savedReadings.length > 0) {
    logEntries.innerHTML = ""
    logEmpty.classList.add("hidden")
    state.savedReadings.forEach((reading) => {
      const entryElement = document.createElement("div")
      entryElement.className = "log-entry"
      entryElement.innerHTML = `
                <div class="log-entry-info">
                    <div class="log-entry-speed">
                        <span class="log-entry-direction">${reading.direction}:</span>
                        <span class="log-entry-value">${reading.speed}</span>
                        <span class="log-entry-unit">mph</span>
                    </div>
                    <div class="log-entry-plate">${reading.plate}</div>
                    <div class="log-entry-time">${reading.timestamp}</div>
                </div>
                <div class="log-entry-actions">
                    <button class="icon-button delete-entry" data-id="${reading.id}" title="Delete entry">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `
      logEntries.appendChild(entryElement)
      const deleteBtn = entryElement.querySelector(".delete-entry")
      deleteBtn.addEventListener("click", () => {
        deleteReading(reading.id)
      })
    })
  } else {
    logEntries.innerHTML = ""
    logEmpty.classList.remove("hidden")
  }
}

function deleteReading(id) {
  state.savedReadings = state.savedReadings.filter((reading) => reading.id !== id)
  updateLogEntries()
}

function showNotification(message) {
  if (state.notificationType === "native") {
    notification.textContent = message
    notification.classList.remove("hidden")
    setTimeout(() => {
      notification.classList.add("hidden")
    }, 2000)
  } else if (state.notificationType === "custom") {
    fetch("https://sd-policeradar/showNotification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    }).catch(() => {})
  }
}

function updateKeybindsDisplay(keybinds) {
  if (!keybinds) return
  const keybindsList = document.querySelector(".keybinds-list")
  if (!keybindsList) return

  keybindsList.innerHTML = ""
  if (keybinds.SelectFront) {
    addKeybindRow(keybindsList, "Switch to Front", keybinds.SelectFront)
  }
  if (keybinds.SelectRear) {
    addKeybindRow(keybindsList, "Switch to Rear", keybinds.SelectRear)
  }
  if (keybinds.SaveReading) {
    addKeybindRow(keybindsList, "Save Reading", keybinds.SaveReading)
  }
  if (keybinds.LockRadar) {
    addKeybindRow(keybindsList, "Lock/Unlock Radar", keybinds.LockRadar)
  }
  if (keybinds.ToggleLog) {
    addKeybindRow(keybindsList, "Toggle Log", keybinds.ToggleLog)
  }
  if (keybinds.ToggleBolo) {
    addKeybindRow(keybindsList, "Toggle BOLO List", keybinds.ToggleBolo)
  }
  if (keybinds.TogglePosition) {
    addKeybindRow(keybindsList, "Positioning Mode", keybinds.TogglePosition)
  }
  if (keybinds.ToggleKeybinds) {
    addKeybindRow(keybindsList, "Show/Hide Keybinds", keybinds.ToggleKeybinds)
  }
  if (keybinds.Interact) {
    addKeybindRow(keybindsList, "Interact with Radar", keybinds.Interact)
  }
}

function addKeybindRow(container, name, key) {
  const row = document.createElement("div")
  row.className = "keybind-row"
  row.innerHTML = `
    <span class="keybind-name">${name}</span>
    <span class="keybind-key">${formatKeyName(key)}</span>
  `
  container.appendChild(row)
}

function formatKeyName(key) {
  switch (key.toUpperCase()) {
    case "LEFT":
      return "←"
    case "RIGHT":
      return "→"
    case "UP":
      return "↑"
    case "DOWN":
      return "↓"
    default:
      return key.toUpperCase()
  }
}

document.addEventListener("DOMContentLoaded", init)

window.addEventListener("message", (event) => {
  const data = event.data
  if (data.type === "open") {
    document.body.style.display = "block"
  } else if (data.type === "close") {
    document.body.style.display = "none"
  } else if (data.type === "update") {
    updateUIValues(data)
  } else if (data.type === "updateBoloPlates") {
    state.boloPlates = data.plates || []
    updateBoloEntries()
  } else if (data.type === "saveReading") {
    saveReading()
  } else if (data.type === "toggleLock") {
    toggleRadar()
  } else if (data.type === "selectDirection") {
    if (data.data === "Front" || data.data === "Rear") {
      selectDirection(data.data)
    }
  } else if (data.type === "toggleLog") {
    toggleLog()
  } else if (data.type === "toggleBolo") {
    toggleBolo()
  } else if (data.type === "toggleKeybinds") {
    toggleKeybinds()
  } else if (data.type === "setKeybinds") {
    updateKeybindsDisplay(data.keybinds)
    if (data.keybinds && data.keybinds.Interact) {
      state.interactKey = data.keybinds.Interact
    }
  } else if (data.type === "setNotificationType") {
    state.notificationType = data.notificationType || "native"
  } else if (data.type === "loadPositions") {
    applyPositions(data.positions)
  }
})

