local radarEnabled = false
local radarWasEnabled = false
local interacting = false
local boloPlates = {}

-- Send NUI messages only when radar is enabled
local function SendIfRadarEnabled(message)
	if radarEnabled then
		SendNUIMessage(message)
	end
end

-- Load/save radar UI positions from resource KVP
local function LoadSavedPositions()
	local jsonStr = GetResourceKvpString("radar_positions")
	return jsonStr and json.decode(jsonStr) or nil
end

local function SavePositions(positions)
	if positions then
		SetResourceKvp("radar_positions", json.encode(positions))
	end
end

-- Toggle the radar UI open/close
local function ToggleRadar()
	local ped = PlayerPedId()
	if not IsPedInAnyVehicle(ped, false) then
		return
	end

	if Config.RestrictToVehicleClass.Enable then
		local veh = GetVehiclePedIsIn(ped, false)
		local vehClass = GetVehicleClass(veh)
		if vehClass ~= Config.RestrictToVehicleClass.Class then
			return
		end
	end

	radarEnabled = not radarEnabled

	if radarEnabled then
		radarWasEnabled = false
		SendNUIMessage({ type = "open" })
		SendNUIMessage({ type = "setKeybinds", keybinds = Config.Keybinds })
		SendNUIMessage({ type = "setNotificationType", notificationType = Config.NotificationType })

		local saved = LoadSavedPositions()
		if saved then
			SendNUIMessage({ type = "loadPositions", positions = saved })
		end
	else
		interacting = false
		SetNuiFocus(false, false)
		SendNUIMessage({ type = "close" })
	end
end

-- Register slash command and keybind to toggle
RegisterCommand("radar", ToggleRadar, false)
RegisterKeyMapping("radar", "Toggle Radar", "keyboard", Config.Keybinds.ToggleRadar)

-- Toggle UI interaction mode
RegisterCommand("radarInteract", function()
	if radarEnabled then
		interacting = not interacting
		SetNuiFocus(interacting, interacting)
		SetNuiFocusKeepInput(interacting)
	end
end, false)
RegisterKeyMapping("radarInteract", "Interact with Radar UI", "keyboard", Config.Keybinds.Interact)

local simpleCommands = {
	radarSave           = { key = Config.Keybinds.SaveReading, desc = "Save Radar Reading", msg = { type = "saveReading" } },
	radarLock           = { key = Config.Keybinds.LockRadar, desc = "Toggle Radar Lock", msg = { type = "toggleLock" } },
	radarSelectFront    = { key = Config.Keybinds.SelectFront, desc = "Select Front", msg = { type = "selectDirection", data = "Front" } },
	radarSelectRear     = { key = Config.Keybinds.SelectRear, desc = "Select Rear", msg = { type = "selectDirection", data = "Rear" } },
	radarToggleLog      = { key = Config.Keybinds.ToggleLog, desc = "Toggle Radar Log", msg = { type = "toggleLog" } },
	radarToggleBolo     = { key = Config.Keybinds.ToggleBolo, desc = "Toggle BOLO List", msg = { type = "toggleBolo" } },
	radarToggleKeybinds = { key = Config.Keybinds.ToggleKeybinds, desc = "Toggle Radar Keybinds", msg = { type = "toggleKeybinds" } },
}

for cmd, info in pairs(simpleCommands) do
	RegisterCommand(cmd, function() SendIfRadarEnabled(info.msg) end, false)
	RegisterKeyMapping(cmd, info.desc, "keyboard", info.key)
end

-- NUI callbacks for BOLO, notifications, saving, input focus
RegisterNUICallback("addBoloPlate", function(data, cb)
	if data.plate then
		table.insert(boloPlates, data.plate)
		SendNUIMessage({ type = "updateBoloPlates", plates = boloPlates })
	end
	cb({})
end)

RegisterNUICallback("removeBoloPlate", function(data, cb)
	if data.plate then
		for i, p in ipairs(boloPlates) do
			if p == data.plate then
				table.remove(boloPlates, i)
				break
			end
		end
		SendNUIMessage({ type = "updateBoloPlates", plates = boloPlates })
	end
	cb({})
end)

RegisterNUICallback("boloAlert", function(data, cb)
	PlaySoundFrontend(-1, "TIMER_STOP", "HUD_MINI_GAME_SOUNDSET", 1)
	cb({})
end)

RegisterNUICallback("showNotification", function(data, cb)
	if Config.NotificationType == "custom" and data.message then
		ShowNotification(data.message)
	end
	cb({})
end)

RegisterNUICallback("savePositions", function(data, cb)
	SavePositions(data)
	cb({})
end)

RegisterNUICallback("inputActive", function(data, cb)
	interacting = true
	SetNuiFocusKeepInput(false)
	cb({})
end)

RegisterNUICallback("inputInactive", function(data, cb)
	if radarEnabled then
		SetNuiFocusKeepInput(interacting)
	end
	cb({})
end)

-- Open/close UI helpers
local function OpenRadarUI()
	SendNUIMessage({ type = "open" })
	SendNUIMessage({ type = "setKeybinds", keybinds = Config.Keybinds })
	SendNUIMessage({ type = "setNotificationType", notificationType = Config.NotificationType })
	local saved = LoadSavedPositions()
	if saved then
		SendNUIMessage({ type = "loadPositions", positions = saved })
	end
end

local function CloseRadarUI()
	interacting = false
	SetNuiFocus(false, false)
	SendNUIMessage({ type = "close" })
end

local function DoRadarUpdate(ped, veh)
	local pos              = GetEntityCoords(ped)
	local forward          = GetEntityForwardVector(ped)

	local frontTarget      = vector3(
		pos.x + forward.x * Config.FrontDetectionRange,
		pos.y + forward.y * Config.FrontDetectionRange,
		pos.z
	)
	local rearTarget       = vector3(
		pos.x - forward.x * Config.RearDetectionRange,
		pos.y - forward.y * Config.RearDetectionRange,
		pos.z
	)

	local startPos         = GetOffsetFromEntityInWorldCoords(veh, 0.0, 1.0, 1.0)

	local fRay             = StartShapeTestCapsule(startPos, frontTarget, 6.0, 10, veh, 7)
	local _, _, _, _, fEnt = GetShapeTestResult(fRay)
	local fSpeed, fPlate   = 0, ""
	if IsEntityAVehicle(fEnt) then
		fSpeed = math.ceil(GetEntitySpeed(fEnt) * Config.SpeedMultiplier)
		fPlate = GetVehicleNumberPlateText(fEnt)
	end

	local rRay = StartShapeTestCapsule(startPos, rearTarget, 3.0, 10, veh, 7)
	local _, _, _, _, rEnt = GetShapeTestResult(rRay)
	local rSpeed, rPlate = 0, ""
	if IsEntityAVehicle(rEnt) then
		rSpeed = math.ceil(GetEntitySpeed(rEnt) * Config.SpeedMultiplier)
		rPlate = GetVehicleNumberPlateText(rEnt)
	end

	SendNUIMessage({
		type       = "update",
		frontSpeed = fSpeed,
		rearSpeed  = rSpeed,
		frontPlate = fPlate,
		rearPlate  = rPlate
	})
end

local disableControls = { 1, 2, 24, 25, 68, 69, 70, 91, 92 }
for cmd, _ in pairs(simpleCommands) do
	table.insert(disableControls, GetHashKey("+" .. cmd))
end

-- Main thread loop
CreateThread(function()
	local lastUpdate = GetGameTimer()

	while true do
		local ped   = PlayerPedId()
		local veh   = GetVehiclePedIsIn(ped, false)
		local inVeh = veh ~= 0
		local now   = GetGameTimer()

		if inVeh then
			if radarWasEnabled and not radarEnabled then
				radarEnabled = true
				OpenRadarUI()
				radarWasEnabled = false
			end

			if radarEnabled and (now - lastUpdate >= Config.UpdateInterval) then
				lastUpdate = now
				DoRadarUpdate(ped, veh)
			end
		else
			if radarEnabled then
				if Config.ReopenRadarAfterLeave then
					radarWasEnabled = true
				end
				CloseRadarUI()
				radarEnabled = false
			end
		end

		if radarEnabled and IsControlJustReleased(0, 202) then
			radarEnabled = false
			CloseRadarUI()
		end

		if interacting then
			for _, ctrl in ipairs(disableControls) do
				DisableControlAction(0, ctrl, true)
			end
		end

		if radarEnabled or interacting then
			Wait(0)
		else
			Wait(200)
		end
	end
end)
