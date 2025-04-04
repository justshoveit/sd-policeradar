local radarEnabled = false
local radarWasEnabled = false
local interacting = false
local boloPlates = {}

local SendIfRadarEnabled = function(message)
    if radarEnabled then
        SendNUIMessage(message)
    end
end

local function LoadSavedPositions()
    local positionsJson = GetResourceKvpString("radar_positions")
    if positionsJson then
        return json.decode(positionsJson)
    end
    return nil
end

local function SavePositions(positions)
    if positions then
        SetResourceKvp("radar_positions", json.encode(positions))
    end
end

local ToggleRadar = function()
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

        local savedPositions = LoadSavedPositions()
        if savedPositions then
            SendNUIMessage({ type = "loadPositions", positions = savedPositions })
        end
    else
        interacting = false
        SetNuiFocus(false, false)
        SendNUIMessage({ type = "close" })
    end
end

RegisterCommand("radar", function()
    ToggleRadar()
end, false)

RegisterKeyMapping("radar", "Toggle Radar", "keyboard", Config.Keybinds.ToggleRadar)

RegisterCommand("radarInteract", function()
    if radarEnabled then
        interacting = not interacting
        SetNuiFocus(interacting, interacting)
        SetNuiFocusKeepInput(interacting)
    end
end, false)

RegisterKeyMapping("radarInteract", "Interact with Radar UI", "keyboard", Config.Keybinds.Interact)

local simpleCommands = {
    radarSave = { key = Config.Keybinds.SaveReading, desc = "Save Radar Reading", msg = { type = "saveReading" } },
    radarLock = { key = Config.Keybinds.LockRadar, desc = "Toggle Radar Lock", msg = { type = "toggleLock" } },
    radarSelectFront = { key = Config.Keybinds.SelectFront, desc = "Select Front", msg = { type = "selectDirection", data = "Front" } },
    radarSelectRear = { key = Config.Keybinds.SelectRear, desc = "Select Rear", msg = { type = "selectDirection", data = "Rear" } },
    radarToggleLog = { key = Config.Keybinds.ToggleLog, desc = "Toggle Radar Log", msg = { type = "toggleLog" } },
    radarToggleBolo = { key = Config.Keybinds.ToggleBolo, desc = "Toggle BOLO List", msg = { type = "toggleBolo" } },
    radarToggleKeybinds = { key = Config.Keybinds.ToggleKeybinds, desc = "Toggle Radar Keybinds", msg = { type = "toggleKeybinds" } }
}

for command, info in pairs(simpleCommands) do
    RegisterCommand(command, function() SendIfRadarEnabled(info.msg) end, false)
    RegisterKeyMapping(command, info.desc, "keyboard", info.key)
end

RegisterNUICallback("addBoloPlate", function(data, cb)
    local plate = data.plate
    if plate then
        table.insert(boloPlates, plate)
        SendNUIMessage({ type = "updateBoloPlates", plates = boloPlates })
    end
    cb({})
end)

RegisterNUICallback("removeBoloPlate", function(data, cb)
    local plate = data.plate
    if plate then
        for i, p in ipairs(boloPlates) do
            if p == plate then
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

CreateThread(function()
    local lastUpdate = GetGameTimer()
    while true do
        local ped = PlayerPedId()
        local inVehicle = IsPedInAnyVehicle(ped, false)
        
        if inVehicle then
            if radarWasEnabled and not radarEnabled then
                radarEnabled = true
                SendNUIMessage({ type = "open" })
                SendNUIMessage({ type = "setKeybinds", keybinds = Config.Keybinds })
                SendNUIMessage({ type = "setNotificationType", notificationType = Config.NotificationType })
                local savedPositions = LoadSavedPositions()
                if savedPositions then
                    SendNUIMessage({ type = "loadPositions", positions = savedPositions })
                end
                radarWasEnabled = false
            end

            if radarEnabled then
                local now = GetGameTimer()
                if now - lastUpdate >= Config.UpdateInterval then
                    lastUpdate = now
                    local veh = GetVehiclePedIsIn(ped, false)
                    local pos = GetEntityCoords(ped)
                    local forward = GetEntityForwardVector(ped)
                    local frontTarget = vector3(pos.x + forward.x * Config.FrontDetectionRange, pos.y + forward.y * Config.FrontDetectionRange, pos.z)
                    local rearTarget = vector3(pos.x - forward.x * Config.RearDetectionRange, pos.y - forward.y * Config.RearDetectionRange, pos.z)
                    local startPos = GetOffsetFromEntityInWorldCoords(veh, 0.0, 1.0, 1.0)
                    
                    local frontRay = StartShapeTestCapsule(startPos, frontTarget, 6.0, 10, veh, 7)
                    local _, _, _, _, frontEntity = GetShapeTestResult(frontRay)
                    local frontSpeed, frontPlate = 0, ""
                    if IsEntityAVehicle(frontEntity) then
                        frontSpeed = math.ceil(GetEntitySpeed(frontEntity) * Config.SpeedMultiplier)
                        frontPlate = GetVehicleNumberPlateText(frontEntity)
                    end
                    
                    local rearRay = StartShapeTestCapsule(startPos, rearTarget, 3.0, 10, veh, 7)
                    local _, _, _, _, rearEntity = GetShapeTestResult(rearRay)
                    local rearSpeed, rearPlate = 0, ""
                    if IsEntityAVehicle(rearEntity) then
                        rearSpeed = math.ceil(GetEntitySpeed(rearEntity) * Config.SpeedMultiplier)
                        rearPlate = GetVehicleNumberPlateText(rearEntity)
                    end
                    
                    SendNUIMessage({ type = "update", frontSpeed = frontSpeed, rearSpeed = rearSpeed, frontPlate = frontPlate, rearPlate = rearPlate })
                end
            end
        else
            if radarEnabled then
                if Config.ReopenRadarAfterLeave then
                    radarWasEnabled = true
                end
                SendNUIMessage({ type = "close" })
                radarEnabled = false
                interacting = false
                SetNuiFocus(false, false)
            end
        end

        if radarEnabled and IsControlJustReleased(0, 202) then
            radarEnabled = false
            interacting = false
            SetNuiFocus(false, false)
            SendNUIMessage({ type = "close" })
        end

        if interacting then
            DisableControlAction(0, 1, true)
            DisableControlAction(0, 2, true)
            DisableControlAction(0, 24, true)
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 68, true)
            DisableControlAction(0, 69, true)
            DisableControlAction(0, 70, true)
            DisableControlAction(0, 91, true)
            DisableControlAction(0, 92, true)
            
            for command, _ in pairs(simpleCommands) do
                DisableControlAction(0, GetHashKey("+" .. command), true)
            end
        end

        Wait(0)
    end
end)
