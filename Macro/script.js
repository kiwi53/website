// Core app for Macro Block Programming
let workspace = null
const topBlockTypes = new Set()
const sprites = []
let running = false
let stopped = false
let currentSpriteIndex = 0

// Click-to-run feature flag
let CLICK_TO_RUN_ENABLED = true

// Track which blocks need the agent (by category)
const agentBlockCategories = new Set(['mouse', 'keyboard', 'web and apps', 'computer'])
const blockCategoryMap = new Map() // Maps block type to category name

// Local Agent Connection
const AGENT_URL = 'http://localhost:9001'
let agentConnected = false
let agentCheckInterval = null
let isInitialLoad = true

async function checkAgentConnection() {
  if (isInitialLoad) {
    updateAgentStatus('connecting')
  }
  
  try {
    const response = await fetch(`${AGENT_URL}/status`, {
      method: 'GET',
      mode: 'cors'
    })
    const data = await response.json()
    agentConnected = data.status === 'running'
    updateAgentStatus('connected')
  } catch (error) {
    agentConnected = false
    updateAgentStatus('disconnected')
  }
  
  isInitialLoad = false
}

function updateAgentStatus(state) {
  const statusEl = document.getElementById('agentStatus')
  if (statusEl) {
    if (state === 'connected') {
      statusEl.textContent = '🟢 Agent Connected'
      statusEl.className = 'agent-status connected'
      statusEl.title = 'Local agent is running and ready to execute commands'
    } else if (state === 'connecting') {
      statusEl.textContent = '🟡 Agent Connecting'
      statusEl.className = 'agent-status connecting'
      statusEl.title = 'Checking agent connection...'
    } else {
      statusEl.textContent = '🔴 Agent Disconnected'
      statusEl.className = 'agent-status disconnected'
      statusEl.title = 'Local agent not detected. Please run macro_agent.py'
    }
  }
}

function showAgentWarning() {
  // Remove any existing warning
  const existing = document.getElementById('agentWarningPopup')
  if (existing) existing.remove()
  
  // Create warning popup
  const popup = document.createElement('div')
  popup.id = 'agentWarningPopup'
  popup.className = 'agent-warning-popup'
  popup.innerHTML = `
    <div class="warning-arrow"></div>
    <div class="warning-content">
      <strong>⚠️ Agent Not Running</strong>
      <p>Download and run the agent to execute blocks</p>
    </div>
  `
  document.body.appendChild(popup)
  
  // Position it near the download button
  const downloadBtn = document.querySelector('.btn-download')
  if (downloadBtn) {
    const rect = downloadBtn.getBoundingClientRect()
    popup.style.top = (rect.bottom + 10) + 'px'
    popup.style.left = (rect.left + rect.width / 2) + 'px'
  }
  
  // Make download button pulse
  if (downloadBtn) {
    downloadBtn.classList.add('pulse-red')
  }
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    popup.remove()
    if (downloadBtn) {
      downloadBtn.classList.remove('pulse-red')
    }
  }, 5000)
}

// Check if a block type requires the agent
function blockNeedsAgent(blockType) {
  const category = blockCategoryMap.get(blockType)
  return category && agentBlockCategories.has(category)
}

async function executeOnAgent(blockType, params) {
  if (!agentConnected) {
    log('⚠️ Agent not connected. Please run the local agent.')
    return { success: false, error: 'Agent not connected' }
  }
  
  // Debug: log what we're sending
  console.log('Sending to agent - Type:', blockType, 'Params:', params)
  
  try {
    const response = await fetch(`${AGENT_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: blockType,
        params: params,
        id: Date.now()
      })
    })
    
    const result = await response.json()
    
    // Debug console output
    console.log('Agent result:', result)
    
    // Handle console output actions
    if (result.success && result.result) {
      console.log('Result object check - type:', typeof result.result, 'value:', result.result)
      // Check if result is an object with action property
      if (typeof result.result === 'object' && result.result.action === 'console_output') {
        console.log('✅ Console output detected! Message:', result.result.message, 'Type:', result.result.type)
        addConsoleOutput(result.result.message, result.result.type)
        return result
      }
      // Also check if result is a string that's JSON
      if (typeof result.result === 'string') {
        try {
          const parsed = JSON.parse(result.result)
          if (parsed.action === 'console_output') {
            console.log('Adding to console (parsed):', parsed.message, parsed.type)
            addConsoleOutput(parsed.message, parsed.type)
            return result
          }
        } catch (e) {
          // Not JSON, continue normal flow
        }
      }
    }
    
    if (result.success) {
      log(`✓ ${JSON.stringify(result.result)}`)
    } else {
      log(`✗ Error: ${result.error}`)
    }
    return result
  } catch (error) {
    log(`✗ Agent error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Start checking agent connection periodically
function startAgentCheck() {
  checkAgentConnection()
  agentCheckInterval = setInterval(checkAgentConnection, 3000) // Check every 3 seconds
}

// Stop checking when page unloads
window.addEventListener('beforeunload', () => {
  if (agentCheckInterval) {
    clearInterval(agentCheckInterval)
  }
})

// Load theme preference
let isDarkMode = localStorage.getItem('theme') !== 'light'
let isHighContrastMode = localStorage.getItem('blockColourMode') === 'highContrast'

// Apply theme class immediately
if (!isDarkMode) {
  document.body.classList.add('light-mode')
}

// Apply high contrast mode body attribute immediately
if (isHighContrastMode) {
  document.body.setAttribute('data-block-colour', 'highContrast')
}

console.log('Theme loaded:', isDarkMode ? 'dark' : 'light')

function log(msg){
  // Only log to browser console for debugging, not to macro console
  console.log('[Macro]', msg)
}

// Output from console blocks with type support (log, warning, error)
function blockOutput(msg, type = 'log', icon = '', color = ''){
  const c = document.getElementById('consoleOutput')
  if (c) {
    const msgDiv = document.createElement('div')
    msgDiv.className = `console-message console-${type}`
    msgDiv.setAttribute('data-type', type)
    msgDiv.style.paddingLeft = '8px'
    
    // Always add icon space for alignment (use invisible character if no icon)
    let iconText = icon ? icon : '\u00A0\u00A0' // non-breaking spaces for alignment
    
    // Add prefix symbols for type
    let prefix = iconText + ' '
    if (type === 'warning') prefix += '⚠️ '
    else if (type === 'error') prefix += '❌ '
    
    msgDiv.textContent = prefix + msg
    
    // Apply custom color if specified
    if (color) {
      const colorMap = {
        '🟥 red': '#ff5555',
        '🟧 orange': '#ff8800',
        '🟨 yellow': '#ffff00',
        '🟩 green': '#50fa7b',
        '🟦 blue': '#999999',
        '🟪 purple': '#bd93f9',
        '🟪 violet': '#bd93f9',
        '🟫 brown': '#8b4513',
        '⬛ black': '#cccccc',
        '⬜ white': '#ffffff'
      }
      msgDiv.style.color = colorMap[color] || '#cccccc'
    }
    
    c.appendChild(msgDiv)
    c.scrollTop = c.scrollHeight
    
    // Apply current filter
    applyConsoleFilter()
  }
}

// Apply console filter based on currentConsoleFilter
function applyConsoleFilter() {
  const messages = document.querySelectorAll('.console-message')
  messages.forEach(msg => {
    const type = msg.getAttribute('data-type')
    if (currentConsoleFilter === 'all') {
      msg.style.display = 'block'
    } else {
      msg.style.display = (type === currentConsoleFilter) ? 'block' : 'none'
    }
  })
}

/* Variables Management */
let variables = JSON.parse(localStorage.getItem('macroVariables') || '[]')

function saveVariables() {
  localStorage.setItem('macroVariables', JSON.stringify(variables))
}

function getDefaultValue(type) {
  switch(type) {
    case 'value': return ''
    case 'string': return ''
    case 'number': return 0
    case 'boolean': return false
    case 'array': return []
    case 'object': return {}
    default: return null
  }
}

function renderVariablesTable() {
  const tbody = document.getElementById('variablesTableBody')
  if (!tbody) return
  
  tbody.innerHTML = ''
  
  if (variables.length === 0) {
    const row = document.createElement('tr')
    row.className = 'no-variables'
    row.innerHTML = '<td colspan="4">No variables defined. Click "+ New" to create one.</td>'
    tbody.appendChild(row)
    return
  }
  
  variables.forEach((variable, index) => {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td><strong>${variable.name}</strong></td>
      <td>${variable.type}</td>
      <td>${JSON.stringify(variable.value)}</td>
      <td>
        <button class="btn-delete-variable" data-index="${index}">Delete</button>
      </td>
    `
    tbody.appendChild(row)
  })
  
  // Add delete handlers
  document.querySelectorAll('.btn-delete-variable').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'))
      if (confirm(`Delete variable "${variables[index].name}"?`)) {
        variables.splice(index, 1)
        saveVariables()
        renderVariablesTable()
        updateBlocklyVariableDropdowns()
        console.log('Variable deleted')
      }
    })
  })
}

function updateBlocklyVariableDropdowns() {
  // Update all variable dropdown options in Blockly blocks
  if (!workspace) return
  
  // Get all variable names
  const varNames = variables.map(v => v.name)
  
  // Get all blocks in workspace
  const allBlocks = workspace.getAllBlocks(false)
  
  allBlocks.forEach(block => {
    if (block.type === 'set' || block.type === 'change' || block.type === 'varible_value') {
      // Find the variable field
      const variableField = block.getField('varible')
      if (variableField) {
        const currentValue = variableField.getValue()
        
        // If current value doesn't exist in variables, clear it
        if (currentValue && !varNames.includes(currentValue)) {
          variableField.setValue('')
        }
        
        // Update the dropdown options if it has a generator
        if (variableField.menuGenerator_) {
          // Force refresh of the dropdown
          variableField.doValueUpdate_(variableField.getValue())
        }
      }
    }
  })
}

function getVariableOptions() {
  if (variables.length === 0) {
    return [['no variables', '']]
  }
  return variables.map(v => [v.name, v.name])
}

function setupDraggableBlocks() {
  const blockPreviews = document.querySelectorAll('.block-preview[draggable="true"]')
  
  blockPreviews.forEach(preview => {
    preview.addEventListener('dragstart', (e) => {
      const blockType = preview.getAttribute('data-block-type')
      e.dataTransfer.setData('blockType', blockType)
      e.dataTransfer.effectAllowed = 'copy'
      
      // Add visual feedback
      preview.style.opacity = '0.5'
    })
    
    preview.addEventListener('dragend', (e) => {
      preview.style.opacity = '1'
    })
  })
  
  // Setup drop zone on Blockly workspace
  const blocklyDiv = document.getElementById('blocklyDiv')
  if (blocklyDiv && workspace) {
    blocklyDiv.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    })
    
    blocklyDiv.addEventListener('drop', (e) => {
      e.preventDefault()
      const blockType = e.dataTransfer.getData('blockType')
      
      if (blockType && workspace) {
        // Get the drop position relative to the workspace
        const metrics = workspace.getMetrics()
        const scale = workspace.scale
        
        // Calculate workspace coordinates from mouse position
        const mouseX = e.clientX
        const mouseY = e.clientY
        const blocklyRect = blocklyDiv.getBoundingClientRect()
        
        const x = (mouseX - blocklyRect.left) / scale - metrics.viewLeft
        const y = (mouseY - blocklyRect.top) / scale - metrics.viewTop
        
        // Create the block
        try {
          const newBlock = workspace.newBlock(blockType)
          newBlock.initSvg()
          newBlock.moveBy(x, y)
          newBlock.render()
          
          console.log(`Created ${blockType} block at (${Math.round(x)}, ${Math.round(y)})`)
        } catch (err) {
          console.error('Error creating block:', err)
        }
      }
    })
  }
}

function setupVariablesUI() {
  const newBtn = document.getElementById('newVariableBtn')
  const modal = document.getElementById('variableModal')
  const closeBtn = modal?.querySelector('.modal-close')
  const cancelBtn = document.getElementById('cancelVariableBtn')
  const createBtn = document.getElementById('createVariableBtn')
  const nameInput = document.getElementById('variableName')
  const typeSelect = document.getElementById('variableType')
  
  // Initial render
  renderVariablesTable()
  
  // Make getVariableOptions globally available for block definitions
  window.getVariableOptions = getVariableOptions
  
  // Setup draggable block previews
  setupDraggableBlocks()
  
  // Open modal
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      if (modal) {
        modal.classList.add('active')
        if (nameInput) nameInput.value = ''
        if (typeSelect) typeSelect.value = 'string'
        if (nameInput) nameInput.focus()
      }
    })
  }
  
  // Close modal functions
  const closeModal = () => {
    if (modal) modal.classList.remove('active')
  }
  
  if (closeBtn) closeBtn.addEventListener('click', closeModal)
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal)
  
  // Click outside to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal()
    })
  }
  
  // Create variable
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const name = nameInput?.value.trim()
      const type = 'value' // Always use 'value' type
      
      if (!name) {
        alert('Please enter a variable name')
        return
      }
      
      // Check for duplicate names
      if (variables.some(v => v.name === name)) {
        alert(`Variable "${name}" already exists`)
        return
      }
      
      // Validate variable name (alphanumeric and underscore)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        alert('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores')
        return
      }
      
      // Create new variable
      const newVariable = {
        name: name,
        type: type,
        value: getDefaultValue(type)
      }
      
      variables.push(newVariable)
      saveVariables()
      renderVariablesTable()
      updateBlocklyVariableDropdowns()
      closeModal()
      
      console.log(`Variable "${name}" created with type ${type}`)
    })
  }
  
  // Enter key to create
  if (nameInput) {
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createBtn?.click()
      }
    })
  }
}

// Recursively evaluate a value block to get its result
async function evaluateValueBlock(block, runtime) {
  if (!block) return null
  
  // Math number block
  if (block.type === 'math_number') {
    return Number(block.getFieldValue('NUM') || 0)
  }
  
  // Text field block
  if (block.type === 'text_field') {
    return String(block.getFieldValue('TEXT') || '')
  }
  
  // Key field block (single key input)
  if (block.type === 'key_field') {
    return String(block.getFieldValue('KEY') || '')
  }
  
  // Boolean block
  if (block.type === 'boolean') {
    return block.getFieldValue('state') === 'True'
  }
  
  // Operator value block (arithmetic operations)
  if (block.type === 'value') {
    const fields = collectFields(block)
    const operator = fields.operator || '+'
    
    // Get input blocks
    const input1 = block.getInput('value1')
    const input2 = block.getInput('value2')
    
    let val1 = 0
    let val2 = 0
    
    // Recursively evaluate first value
    if (input1 && input1.connection && input1.connection.targetBlock()) {
      const result = await evaluateValueBlock(input1.connection.targetBlock(), runtime)
      val1 = Number(result) || 0
    } else {
      val1 = Number(fields.value1) || 0
    }
    
    // Recursively evaluate second value
    if (input2 && input2.connection && input2.connection.targetBlock()) {
      const result = await evaluateValueBlock(input2.connection.targetBlock(), runtime)
      val2 = Number(result) || 0
    } else {
      val2 = Number(fields.value2) || 0
    }
    
    // Perform operation
    switch(operator) {
      case '+': return val1 + val2
      case '-': return val1 - val2
      case '*': return val1 * val2
      case '/': return val2 !== 0 ? val1 / val2 : 0
      case 'mod': return val2 !== 0 ? val1 % val2 : 0
      case 'OR': return val1 | val2
      case 'AND': return val1 & val2
      case 'XOR': return val1 ^ val2
      case 'NAND': return ~(val1 & val2)
      case 'NOR': return ~(val1 | val2)
      default: return val1 + val2
    }
  }
  
  // Comparison block (= and !=)
  if (block.type === '=_!=') {
    const fields = await collectFields(block, runtime)
    const operator = fields.operator || '='
    
    // Get input blocks
    const input1 = block.getInput('value1')
    const input2 = block.getInput('value2')
    
    let val1 = null
    let val2 = null
    
    // Recursively evaluate first value
    if (input1 && input1.connection && input1.connection.targetBlock()) {
      val1 = await evaluateValueBlock(input1.connection.targetBlock(), runtime)
    } else if (fields.value1 !== undefined) {
      val1 = fields.value1
    }
    
    // Recursively evaluate second value
    if (input2 && input2.connection && input2.connection.targetBlock()) {
      val2 = await evaluateValueBlock(input2.connection.targetBlock(), runtime)
    } else if (fields.value2 !== undefined) {
      val2 = fields.value2
    }
    
    // Perform comparison (works with any type)
    if (operator === '=') {
      return val1 === val2
    } else if (operator === '!=') {
      return val1 !== val2
    }
    return false
  }
  
  // Variable getter blocks
  if (block.type === 'get') {
    const varName = block.getFieldValue('VAR')
    return runtime.variables[varName]
  }
  
  if (block.type === 'varible_value') {
    const varName = block.getFieldValue('varible')
    if(!varName) return null
    
    const variable = variables.find(v => v.name === varName)
    return variable ? variable.value : null
  }
  
  // For other blocks, try to extract field value
  try {
    const fields = Object.keys(block.fields_ || {})
    if (fields.length > 0) {
      return block.getFieldValue(fields[0])
    }
  } catch(e) {}
  
  return null
}

// Collect named fields from a block instance
async function collectFields(blk, runtime){
  const out = {}
  try{
    for (const inp of (blk.inputList||[])) {
      // Collect field values (dropdowns, text inputs)
      (inp.fieldRow||[]).forEach(f => { 
        try{
          if(f && f.name) out[f.name] = blk.getFieldValue(f.name)
        }catch(e){} 
      })
      
      // Collect values from input_value connections (connected blocks or shadow blocks)
      if(inp.type === Blockly.INPUT_VALUE && inp.name){
        const connectedBlock = inp.connection?.targetBlock()
        if(connectedBlock){
          // Evaluate the connected block to get its value
          const result = await evaluateValueBlock(connectedBlock, runtime)
          out[inp.name] = result
        }
      }
    }
    
    if(Object.keys(out).length===0 && blk.fields_){
      for(const k in blk.fields_) try{ out[k] = blk.getFieldValue(k) }catch(e){}
    }
  }catch(e){ console.warn('collectFields failed', e) }
  
  // Debug: log collected fields
  console.log('collectFields for block', blk.type, ':', out)
  
  return out
}

// Execute a single block instance
async function executeSingleBlock(blk, runtime){
  if(!blk || !blk.type) return
  
  // Highlight block being executed (yellow glow)
  let blockSvg = null
  let originalStroke = ''
  let originalStrokeWidth = ''
  try{
    blockSvg = blk.getSvgRoot ? blk.getSvgRoot() : null
    if(blockSvg){
      const path = blockSvg.querySelector('path')
      if(path){
        originalStroke = path.style.stroke
        originalStrokeWidth = path.style.strokeWidth
        path.style.stroke = '#FFD700'
        path.style.strokeWidth = '6'
      }
    }
  }catch(e){}
  
  // Small delay to ensure highlight is visible
  await new Promise(resolve => setTimeout(resolve, 50))
  
  try{
    switch(blk.type){
      case 'move_steps':{
        const v = Number(blk.getFieldValue('NUM')||0)
        await runtime.sprite.move(v)
        return
      }
      case 'turn_right':{
        const deg = Number(blk.getFieldValue('DEG')||0)
        runtime.sprite.turn(deg); return
      }
      case 'turn_left':{
        const deg = Number(blk.getFieldValue('DEG')||0)
        runtime.sprite.turn(-deg); return
      }
      case 'set_xy':{
        const x = Number(blk.getFieldValue('X')||0)
        const y = Number(blk.getFieldValue('Y')||0)
        runtime.sprite.setXY(x,y); return
      }
      case 'say':{
        const text = blk.getFieldValue('TEXT')||''
        const sec = Number(blk.getFieldValue('TIMER')||1)
        runtime.sprite.say(text, sec); await runtime.wait(sec); return
      }
      case 'change_size':{
        const amt = Number(blk.getFieldValue('AMT')||10)
        runtime.sprite.changeSize(amt); return
      }
      case 'wait_seconds':{
        const s = Number(blk.getFieldValue('SEC')||1)
        await runtime.wait(s); return
      }
      case 'if':{
        // Get condition value from input
        const conditionInput = blk.getInput('condition')
        const conditionBlock = conditionInput?.connection?.targetBlock()
        const condition = conditionBlock ? await evaluateValueBlock(conditionBlock, runtime) : false
        
        // If condition is true, execute nested blocks
        if(condition){
          const substack = blk.getInputTargetBlock('SUBSTACK')
          if(substack){
            let cur = substack
            while(cur){
              await executeSingleBlock(cur, runtime)
              cur = cur.getNextBlock()
            }
          }
        }
        return
      }
      case 'while':{
        // Get condition value from input
        const conditionInput = blk.getInput('condition')
        const conditionBlock = conditionInput?.connection?.targetBlock()
        
        // Keep executing while condition is true
        while(true){
          const condition = conditionBlock ? await evaluateValueBlock(conditionBlock, runtime) : false
          if(!condition) break
          
          const substack = blk.getInputTargetBlock('SUBSTACK')
          if(substack){
            let cur = substack
            while(cur){
              await executeSingleBlock(cur, runtime)
              cur = cur.getNextBlock()
            }
          }
        }
        return
      }
      case 'repeat':{
        // Get times value from input
        const timesInput = blk.getInput('times')
        const timesBlock = timesInput?.connection?.targetBlock()
        const times = timesBlock ? Number(await evaluateValueBlock(timesBlock, runtime)) : 1
        
        // Execute nested blocks N times
        for(let i = 0; i < times; i++){
          const substack = blk.getInputTargetBlock('SUBSTACK')
          if(substack){
            let cur = substack
            while(cur){
              await executeSingleBlock(cur, runtime)
              cur = cur.getNextBlock()
            }
          }
        }
        return
      }
      case 'repeat_forever':{
        // Execute nested blocks forever
        while(true){
          const substack = blk.getInputTargetBlock('SUBSTACK')
          if(substack){
            let cur = substack
            while(cur){
              await executeSingleBlock(cur, runtime)
              cur = cur.getNextBlock()
            }
          }
        }
        return
      }
      case 'set':{
        // Set variable value
        const varName = blk.getFieldValue('varible')
        if(!varName) return
        
        const valueInput = blk.getInput('value')
        const valueBlock = valueInput?.connection?.targetBlock()
        const value = valueBlock ? await evaluateValueBlock(valueBlock, runtime) : 0
        
        // Find and update variable
        const variable = variables.find(v => v.name === varName)
        if(variable){
          variable.value = value
          saveVariables()
          renderVariablesTable()
        }
        return
      }
      case 'change':{
        // Change variable by amount
        const varName = blk.getFieldValue('varible')
        if(!varName) return
        
        const valueInput = blk.getInput('value')
        const valueBlock = valueInput?.connection?.targetBlock()
        const changeAmount = valueBlock ? Number(await evaluateValueBlock(valueBlock, runtime)) : 1
        
        // Find and update variable
        const variable = variables.find(v => v.name === varName)
        if(variable){
          variable.value = Number(variable.value || 0) + changeAmount
          saveVariables()
          renderVariablesTable()
        }
        return
      }
      case 'output':{
        // Get message value from input
        const messageInput = blk.getInput('message')
        const messageBlock = messageInput?.connection?.targetBlock()
        const message = messageBlock ? await evaluateValueBlock(messageBlock, runtime) : ''
        let type = blk.getFieldValue('type') || 'log'
        
        // Handle emoji prefixes in dropdown values
        if (type.includes('warning')) type = 'warning'
        else if (type.includes('error')) type = 'error'
        else type = 'log'
        
        // Output to macro console with type
        blockOutput(String(message), type)
        return
      }
      case 'output_colour':{
        // Get message value from input
        const messageInput = blk.getInput('message')
        const messageBlock = messageInput?.connection?.targetBlock()
        const message = messageBlock ? await evaluateValueBlock(messageBlock, runtime) : ''
        const colour = blk.getFieldValue('colour') || '⬜ white'
        
        // Output to macro console with color
        blockOutput(String(message), 'log', '', colour)
        return
      }
      case 'output_icon':{
        // Get message value from input
        const messageInput = blk.getInput('message')
        const messageBlock = messageInput?.connection?.targetBlock()
        const message = messageBlock ? await evaluateValueBlock(messageBlock, runtime) : ''
        const icon = blk.getFieldValue('icon') || ''
        
        // Output to macro console with icon at start
        const iconText = icon ? icon.split(' ')[0] : ''
        blockOutput(String(message), 'log', iconText)
        return
      }
      case 'output_colour_icon':{
        // Get message value from input
        const messageInput = blk.getInput('message')
        const messageBlock = messageInput?.connection?.targetBlock()
        const message = messageBlock ? await evaluateValueBlock(messageBlock, runtime) : ''
        const colour = blk.getFieldValue('colour') || '⬜ white'
        const icon = blk.getFieldValue('icon') || ''
        
        // Output to macro console with icon at start and color
        const iconText = icon ? icon.split(' ')[0] : ''
        blockOutput(String(message), 'log', iconText, colour)
        return
      }
      default:
        break
    }

    // server-backed block
    const fields = await collectFields(blk, runtime)
    
    // Check if this is a keyboard or mouse block that should use the agent
    // (Control and console blocks are handled locally by JavaScript generators)
    const agentBlockTypes = [
                             // Keyboard blocks
                             'press_key', 'press_key_for', 'type_string', 'press_key_with_modifier',
                             'hold_key_with_modifier', 'wait_for_key', 'wait_any_key',
                             // Mouse blocks
                             'move', 'glide', 'scroll_mouse', 'press_mouse', 'double_press_mouse',
                             // Only 'wait' control block needs agent (for sleep)
                             'wait']
    
    if (agentBlockTypes.some(type => blk.type.includes(type) || blk.type === type)) {
      log('Executing on agent: ' + blk.type + ' ' + JSON.stringify(fields))
      const result = await executeOnAgent(blk.type, fields)
      if (!result.success) {
        log('⚠️ Agent execution failed. Make sure agent is running.')
      }
      return
    }
    
    // Fallback to server-backed block for other types
    log('Executing server block: ' + blk.type + ' ' + JSON.stringify(fields))
    const resp = await fetch('/api/run_block', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ type: blk.type, fields }) })
    try{ const json = await resp.json(); log('Server response: ' + JSON.stringify(json)) }catch(e){ log('Server response parse failed: ' + String(e)) }
  }catch(e){ 
    log('executeSingleBlock error: ' + String(e)); console.warn(e) 
  }finally{
    // Remove highlight
    if(blockSvg){
      try{
        const path = blockSvg.querySelector('path')
        if(path){
          path.style.stroke = ''
          path.style.strokeWidth = ''
        }
      }catch(e){}
    }
  }
}

/* Stage & Sprite rendering */
function createSprite(){
  const sprite = {
    id: Date.now() + Math.random(),
    name: 'Sprite' + (sprites.length + 1),
    x: 240,
    y: 180,
    angle: 0,
    size: 1,
    say: '',
    color: `hsl(${Math.floor(Math.random()*360)},70%,60%)`,
  }
  sprites.push(sprite)
  currentSpriteIndex = sprites.length - 1
  drawStage()
}

function drawStage(){
  const canvas = document.getElementById('stageCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0,0,canvas.width, canvas.height)
  
  // background
  ctx.fillStyle = '#dfeef7'
  ctx.fillRect(0,0,canvas.width, canvas.height)
  
  // Draw sprites
  sprites.forEach((s, idx)=>{
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate((s.angle||0) * Math.PI/180)
    const size = 24 * (s.size||1)
    
    // body
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.ellipse(0,0,size, size*0.7, 0, 0, Math.PI*2)
    ctx.fill()
    
    // eye
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(size*0.4, -size*0.15, size*0.25,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.arc(size*0.45, -size*0.15, size*0.08,0,Math.PI*2); ctx.fill()
    
    // pointer arrow
    ctx.fillStyle = '#00000055'
    ctx.fillRect(-size/2, size*0.6, size, 2)
    
    // selection highlight
    if(idx === currentSpriteIndex){
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(-size-6, -size-10, size*2+12, size*1.8+22)
    }
    ctx.restore()
    
    // say bubble
    if(s.say){
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#333'
      ctx.font = '14px sans-serif'
      const tw = ctx.measureText(s.say).width + 12
      ctx.beginPath(); ctx.roundRect(s.x+30, s.y-60, tw, 30, 6); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#000'; ctx.fillText(s.say, s.x+36, s.y-40)
    }
  })
}

/* Helpers */
function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

async function runUserCode(func){
  running = true; stopped = false
  updateStartStopButton()
  try{
    await func()
    log('Program finished')
  }catch(err){
    if(stopped){ log('Stopped') } else { log('Runtime error: ' + String(err)) }
  }
  running = false
  updateStartStopButton()
}

function stopAll(){ 
  stopped = true
  running = false
  updateStartStopButton()
  log('Stopping...')
}

function updateStartStopButton(){
  const btn = document.getElementById('startAll')
  if(!btn) return
  if(running){
    btn.innerText = 'Stop'
    btn.style.background = '#e74c3c'
  }else{
    btn.innerText = 'Start'
    btn.style.background = ''
  }
}

/* Blockly initialization */
async function initBlockly(){
  if(typeof Blockly === 'undefined'){
    log('Blockly library not loaded')
    return false
  }
  
  try{
    // Create custom theme
    const baseTheme = isHighContrastMode ? {
      'base': Blockly.Themes.Classic,
      'blockStyles': {
        'colour_blocks': { 'colourPrimary': '#FF6680', 'colourSecondary': '#FF4D6A', 'colourTertiary': '#000000' },
        'list_blocks': { 'colourPrimary': '#FF6680', 'colourSecondary': '#FF4D6A', 'colourTertiary': '#000000' },
        'logic_blocks': { 'colourPrimary': '#5CB1D6', 'colourSecondary': '#47A8D1', 'colourTertiary': '#000000' },
        'loop_blocks': { 'colourPrimary': '#5CB1D6', 'colourSecondary': '#47A8D1', 'colourTertiary': '#000000' },
        'math_blocks': { 'colourPrimary': '#5CB1D6', 'colourSecondary': '#47A8D1', 'colourTertiary': '#000000' },
        'procedure_blocks': { 'colourPrimary': '#9966FF', 'colourSecondary': '#855CD6', 'colourTertiary': '#000000' },
        'text_blocks': { 'colourPrimary': '#59C059', 'colourSecondary': '#46B946', 'colourTertiary': '#000000' },
        'variable_blocks': { 'colourPrimary': '#FF8C1A', 'colourSecondary': '#FF8000', 'colourTertiary': '#000000' },
      },
      'componentStyles': {
        'workspaceBackgroundColour': isDarkMode ? '#1e2532' : '#ffffff',
        'toolboxBackgroundColour': isDarkMode ? '#161b28' : '#d8d8d8',
        'toolboxForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutBackgroundColour': isDarkMode ? '#2a3544' : '#f5f5f5',
        'flyoutForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutOpacity': 1,
        'scrollbarColour': '#555555',
        'scrollbarOpacity': 0.4,
      }
    } : {
      'base': Blockly.Themes.Classic,
      'componentStyles': {
        'workspaceBackgroundColour': isDarkMode ? '#1e2532' : '#ffffff',
        'toolboxBackgroundColour': isDarkMode ? '#161b28' : '#d8d8d8',
        'toolboxForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutBackgroundColour': isDarkMode ? '#2a3544' : '#f5f5f5',
        'flyoutForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutOpacity': 1,
        'scrollbarColour': isDarkMode ? '#555555' : '#888888',
        'scrollbarOpacity': 0.4,
        'insertionMarkerColour': '#ffffff',
        'insertionMarkerOpacity': 0.3,
        'cursorColour': '#555555'
      }
    }
    
    const customTheme = Blockly.Theme.defineTheme('customTheme', baseTheme)
    
    // Create initial toolbox - will be replaced by JSON files
    const initialToolbox = `
      <xml id="toolbox" style="display: none">
        <category name="Loading..." colour="#888888"></category>
      </xml>
    `
    
    // Set agent status to connecting when Loading... category is shown
    updateAgentStatus('connecting')
    
    workspace = Blockly.inject('blocklyDiv', {
      toolbox: initialToolbox,
      scrollbars: true,
      trashcan: true,
      renderer: 'zelos',
      theme: customTheme,
      zoom: {
        controls: false,
        wheel: false,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      }
    })
    log('Blockly workspace initialized')
    
    // Setup zoom controls
    const zoomInBtn = document.getElementById('zoomInBtn')
    const zoomOutBtn = document.getElementById('zoomOutBtn')
    const blocklyDiv = document.getElementById('blocklyDiv')
    
    // Helper function to zoom with proper centering
    function zoomWorkspace(scale) {
      const metrics = workspace.getMetrics()
      const centerX = metrics.viewWidth / 2
      const centerY = metrics.viewHeight / 2
      workspace.zoom(centerX, centerY, scale)
    }
    
    // Zoom in button
    zoomInBtn.addEventListener('click', () => {
      zoomWorkspace(1.2)
    })
    
    // Zoom out button
    zoomOutBtn.addEventListener('click', () => {
      zoomWorkspace(-1.2)
    })
    
    // Mouse wheel zoom
    blocklyDiv.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1.1 : 1.1
      zoomWorkspace(delta)
    }, { passive: false })
    
    // Load blocks from JSON files
    await loadBlocksFromJson()
    
    // Click-to-run listener
    let lastClickTime = 0
    let lastClickBlock = null
    let valueBubbleElement = null
    let valueBubbleBlock = null
    let valueBubbleTimeout = null
    let isDragging = false
    let animationFrameId = null
    
    // Function to update bubble position
    function updateBubblePosition(){
      if(!valueBubbleElement || !valueBubbleBlock) return
      
      const blockSvg = valueBubbleBlock.getSvgRoot()
      const blockRect = blockSvg.getBoundingClientRect()
      const workspaceDiv = document.getElementById('blocklyDiv')
      const workspaceRect = workspaceDiv.getBoundingClientRect()
      
      const left = blockRect.left - workspaceRect.left + (blockRect.width / 2)
      const top = blockRect.bottom - workspaceRect.top + 10
      
      valueBubbleElement.style.left = left + 'px'
      valueBubbleElement.style.top = top + 'px'
      
      // Continue updating while dragging
      if(isDragging){
        animationFrameId = requestAnimationFrame(updateBubblePosition)
      }
    }
    
    // Function to remove bubble
    function removeBubble(){
      if(valueBubbleElement){
        valueBubbleElement.remove()
        valueBubbleElement = null
        valueBubbleBlock = null
      }
      if(valueBubbleTimeout){
        clearTimeout(valueBubbleTimeout)
        valueBubbleTimeout = null
      }
      if(animationFrameId){
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      isDragging = false
    }
    
    workspace.addChangeListener(async function(event){
      try{
        // Style dropdown fields for warning/error
        if(event.type === Blockly.Events.BLOCK_CREATE || event.type === Blockly.Events.BLOCK_CHANGE){
          const block = event.blockId ? workspace.getBlockById(event.blockId) : null
          if(block && block.type === 'output'){
            const typeField = block.getField('type')
            if(typeField){
              const value = typeField.getValue()
              const fieldGroup = typeField.fieldGroup_
              if(fieldGroup){
                const textElement = fieldGroup.querySelector('text')
                if(textElement){
                  if(value && value.includes('warning')){
                    textElement.style.fill = '#daa520'
                  }else if(value && value.includes('error')){
                    textElement.style.fill = '#f14c4c'
                  }else{
                    textElement.style.fill = ''
                  }
                }
              }
            }
          }
        }
        
        // Track dragging state
        if(valueBubbleBlock && event.blockId === valueBubbleBlock.id){
          if(event.type === Blockly.Events.BLOCK_DRAG){
            if(!event.isStart){
              // Drag ended
              isDragging = false
              if(animationFrameId){
                cancelAnimationFrame(animationFrameId)
                animationFrameId = null
              }
            } else {
              // Drag started
              isDragging = true
              updateBubblePosition()
            }
          }
        }
        
        // Check for block click events - the event type is "click" and blockId is present
        if(event.type === 'click' && event.blockId){
          if(!CLICK_TO_RUN_ENABLED) return
          
          const bid = event.blockId
          const now = Date.now()
          
          // Prevent double-firing (clicking same block within 300ms)
          if(bid === lastClickBlock && now - lastClickTime < 300) {
            return
          }
          
          lastClickBlock = bid
          lastClickTime = now
          
          const blk = workspace.getBlockById(bid)
          if(!blk) return
          
          // Check if it's a value or boolean block (output blocks)
          const isValueBlock = blk.outputConnection !== null
          
          if(isValueBlock){
            // Evaluate the block and show result in speech bubble
            const runtime = makeRuntime(sprites[currentSpriteIndex] || {x:240,y:180})
            const result = await evaluateValueBlock(blk, runtime)
            
            // Remove previous bubble if exists
            removeBubble()
            
            // Create custom speech bubble
            const resultText = String(result)
            const blockSvg = blk.getSvgRoot()
            const blockRect = blockSvg.getBoundingClientRect()
            const workspaceDiv = document.getElementById('blocklyDiv')
            const workspaceRect = workspaceDiv.getBoundingClientRect()
            
            valueBubbleElement = document.createElement('div')
            valueBubbleElement.className = 'value-speech-bubble'
            valueBubbleElement.textContent = resultText
            valueBubbleBlock = blk
            
            // Position below the block
            const left = blockRect.left - workspaceRect.left + (blockRect.width / 2)
            const top = blockRect.bottom - workspaceRect.top + 10
            
            valueBubbleElement.style.left = left + 'px'
            valueBubbleElement.style.top = top + 'px'
            
            workspaceDiv.appendChild(valueBubbleElement)
            
            // Remove bubble after 3 seconds
            valueBubbleTimeout = setTimeout(removeBubble, 3000)
            
            log(`Block value: ${blk.type} = ${resultText}`)
          } else {
            // Check if agent is needed for this block type
            if (!agentConnected && blockNeedsAgent(blk.type)) {
              showAgentWarning()
              log('⚠️ Agent not connected. Please download and run the agent.')
              return
            }
            
            // Regular command block - run it and blocks underneath
            log('Block clicked: ' + blk.type + ' — running from this block down')
            const runtime = makeRuntime(sprites[currentSpriteIndex] || {x:240,y:180})
            runtime.sprite = spriteAPI(sprites[currentSpriteIndex] || {x:240,y:180})
            // Run from clicked block and all blocks underneath
            let cur = blk
            while(cur){
              await executeSingleBlock(cur, runtime)
              if(stopped) break
              cur = cur.getNextBlock()
            }
            log('Click-run finished')
          }
        }
      }catch(e){ console.warn('click-run listener error', e) }
    })
    
    // High contrast mode listener - apply to new blocks
    workspace.addChangeListener(function(event){
      try{
        if(event.type === Blockly.Events.BLOCK_CREATE || event.type === Blockly.Events.CREATE){
          const currentMode = localStorage.getItem('blockColourMode') || 'original'
          if(currentMode === 'highContrast'){
            const blockId = event.blockId
            if(blockId){
              const block = workspace.getBlockById(blockId)
              if(block && !block.isShadow()){
                // Store original colour
                if(!block._originalColour && block.colour_){
                  block._originalColour = block.colour_
                }
                // Keep the same color (theme handles saturation)
                // The CSS and theme will make text black
              }
            }
          }
        }
      }catch(e){ console.warn('high contrast listener error', e) }
    })
    
    return true
  }catch(e){
    console.warn('Blockly.inject failed', e)
    log('Blockly init error: ' + (e && e.message ? e.message : String(e)))
    return false
  }
}

// Load blocks from JSON files
let enabledPlugins = JSON.parse(localStorage.getItem('enabledPlugins') || '[]')
let allCategories = []

async function loadBlocksFromJson(){
  try{
    // Get list of all JSON files in blocks directory
    const blockFiles = []
    const knownFiles = [
      'control.json',
      'mouse.json',
      'keyboard.json',
      'operators.json',
      'debug.json',
      'varible.json',
      'web&apps.json',
      'console.json',
      'computer.json'
    ]
    
    // Try to load all known files
    for (const file of knownFiles) {
      blockFiles.push(file)
    }
    
    const categories = []
    allCategories = []
    
    for (const file of blockFiles) {
      try {
        const encodedFile = encodeURIComponent(file)
        const response = await fetch(`blocks/${encodedFile}`)
        if (!response.ok) {
          console.warn(`Failed to load ${file}: ${response.status}`)
          continue
        }
        
        const category = await response.json()
        if (category && category.blocks && category.blocks.length > 0) {
          allCategories.push({ ...category, fileName: file })
          
          // Filter based on state field
          const state = category.state || 'default'
          
          // Skip hidden categories
          if (state === 'hide') {
            continue
          }
          
          // Plugin state: only add if enabled
          if (state === 'plugin') {
            if (enabledPlugins.includes(file)) {
              categories.push(category)
            }
          } else {
            // Default and debug states: show normally
            categories.push(category)
          }
        }
      } catch (err) {
        console.warn(`Failed to load ${file}:`, err)
      }
    }
    
    if (categories.length === 0) {
      log('No block categories found, using default blocks')
      registerDefaultBlocks()
      return
    }
    
    // Build combined JSON structure
    const combined = { categories }
    const text = JSON.stringify(combined)
    await applyBlockJson(text, { replaceToolbox: true })
    log(`Loaded ${categories.length} categories from JSON files`)
  }catch(e){
    console.warn('loadBlocksFromJson failed', e)
    registerDefaultBlocks()
  }
}

// Register default blocks
function registerDefaultBlocks(){
  const startBlock = { "type":"start","message0":"start","args0":[],"colour": 60, "nextStatement": null }
  topBlockTypes.add('start')
  
  Blockly.defineBlocksWithJsonArray([
    startBlock,
    { "type":"move_steps","message0":"move %1 steps","args0":[{"type":"field_number","name":"NUM","value":10}],"previousStatement": null,"nextStatement": null,"colour": 160 },
    { "type":"turn_right","message0":"turn right %1 degrees","args0":[{"type":"field_angle","name":"DEG","angle":15}],"previousStatement":null,"nextStatement":null,"colour": 230},
    { "type":"turn_left","message0":"turn left %1 degrees","args0":[{"type":"field_angle","name":"DEG","angle":15}],"previousStatement":null,"nextStatement":null,"colour":230},
    { "type":"set_xy","message0":"go to x: %1 y: %2","args0":[{"type":"field_number","name":"X","value":0},{"type":"field_number","name":"Y","value":0}],"previousStatement":null,"nextStatement":null,"colour":160},
    { "type":"say","message0":"say %1 for %2 seconds","args0":[{"type":"field_input","name":"TEXT","text":"Hello"},{"type":"field_number","name":"TIMER","value":2}],"previousStatement":null,"nextStatement":null,"colour":20},
    { "type":"change_size","message0":"change size by %1","args0":[{"type":"field_number","name":"AMT","value":10}],"previousStatement":null,"nextStatement":null,"colour":300},
    { "type":"wait_seconds","message0":"wait %1 seconds","args0":[{"type":"field_number","name":"SEC","value":1}],"previousStatement":null,"nextStatement":null,"colour":120}
  ])
  
  // JS generators for default blocks
  Blockly.JavaScript['start'] = function(block){
    let code = ''
    let n = block.getNextBlock()
    while(n){
      let c = Blockly.JavaScript.blockToCode(n)
      if(Array.isArray(c)) c = c[0] || ''
      code += (c || '')
      n = n.getNextBlock()
    }
    return code
  }
  
  Blockly.JavaScript['move_steps'] = function(block){
    const val = Number(block.getFieldValue('NUM')||0)
    return `await runtime.sprite.move(${val});\n`;
  }
  
  Blockly.JavaScript['turn_right'] = function(block){
    const deg = Number(block.getFieldValue('DEG')||0)
    return `runtime.sprite.turn(${deg});\n`;
  }
  
  Blockly.JavaScript['turn_left'] = function(block){
    const deg = Number(block.getFieldValue('DEG')||0)
    return `runtime.sprite.turn(${-deg});\n`;
  }
  
  Blockly.JavaScript['set_xy'] = function(block){
    const x = Number(block.getFieldValue('X')||0)
    const y = Number(block.getFieldValue('Y')||0)
    return `runtime.sprite.setXY(${x},${y});\n`;
  }
  
  Blockly.JavaScript['say'] = function(block){
    const text = block.getFieldValue('TEXT')
    const sec = Number(block.getFieldValue('TIMER')||1)
    return `runtime.sprite.say(${JSON.stringify(text)}, ${sec});\nawait runtime.wait(${sec});\n`;
  }
  
  Blockly.JavaScript['change_size'] = function(block){
    const amt = Number(block.getFieldValue('AMT')||10)
    return `runtime.sprite.changeSize(${amt});\n`;
  }
  
  Blockly.JavaScript['wait_seconds'] = function(block){
    const s = Number(block.getFieldValue('SEC')||1)
    return `await runtime.wait(${s});\n`;
  }
  
  // Control block generators
  Blockly.JavaScript['wait'] = function(block){
    const duration = Blockly.JavaScript.valueToCode(block, 'duration', Blockly.JavaScript.ORDER_ATOMIC) || '1';
    return `await executeOnAgent('wait', {duration: ${duration}});\n`;
  }
  
  Blockly.JavaScript['repeat'] = function(block){
    const times = Blockly.JavaScript.valueToCode(block, 'times', Blockly.JavaScript.ORDER_ATOMIC) || '1';
    const innerCode = Blockly.JavaScript.statementToCode(block, 'DO');
    return `for(let i=0; i<${times}; i++){\n${innerCode}}\n`;
  }
  
  Blockly.JavaScript['repeat_forever'] = function(block){
    const innerCode = Blockly.JavaScript.statementToCode(block, 'DO');
    return `while(true){\n${innerCode}}\n`;
  }
  
  Blockly.JavaScript['if'] = function(block){
    const condition = Blockly.JavaScript.valueToCode(block, 'condition', Blockly.JavaScript.ORDER_ATOMIC) || 'false';
    const innerCode = Blockly.JavaScript.statementToCode(block, 'DO');
    return `if(${condition}){\n${innerCode}}\n`;
  }
  
  Blockly.JavaScript['while'] = function(block){
    const condition = Blockly.JavaScript.valueToCode(block, 'condition', Blockly.JavaScript.ORDER_ATOMIC) || 'false';
    const innerCode = Blockly.JavaScript.statementToCode(block, 'DO');
    return `while(${condition}){\n${innerCode}}\n`;
  }
  
  // Console block generators
  Blockly.JavaScript['output'] = function(block){
    const message = Blockly.JavaScript.valueToCode(block, 'message', Blockly.JavaScript.ORDER_ATOMIC) || '""';
    const type = block.getFieldValue('type') || 'log';
    return `console.${type}(${message});\n`;
  }
  
  Blockly.JavaScript['output_colour'] = function(block){
    const message = Blockly.JavaScript.valueToCode(block, 'message', Blockly.JavaScript.ORDER_ATOMIC) || '""';
    const colour = block.getFieldValue('colour') || '⬜ white';
    const colorMap = {
      '🟥 red': 'color: #ff0000',
      '🟧 orange': 'color: #ff8800',
      '🟨 yellow': 'color: #ffff00',
      '🟩 green': 'color: #00ff00',
      '🟦 blue': 'color: #999999',
      '🟪 purple': 'color: #8800ff',
      '🟫 brown': 'color: #8b4513',
      '⬛ black': 'color: #000000',
      '⬜ white': 'color: #ffffff'
    };
    const style = colorMap[colour] || 'color: #ffffff';
    return `console.log('%c' + ${message}, '${style}');\n`;
  }
  
  Blockly.JavaScript['output_colour_icon'] = function(block){
    const message = Blockly.JavaScript.valueToCode(block, 'message', Blockly.JavaScript.ORDER_ATOMIC) || '""';
    const colour = block.getFieldValue('colour') || '⬜ white';
    const icon = block.getFieldValue('icon') || 'none';
    const colorMap = {
      '🟥 red': 'color: #ff0000',
      '🟧 orange': 'color: #ff8800',
      '🟨 yellow': 'color: #ffff00',
      '🟩 green': 'color: #00ff00',
      '🟦 blue': 'color: #999999',
      '🟪 violet': 'color: #8800ff',
      '🟫 brown': 'color: #8b4513',
      '⬛ black': 'color: #000000',
      '⬜ white': 'color: #ffffff'
    };
    const style = colorMap[colour] || 'color: #ffffff';
    const iconText = icon === 'none' ? '' : icon.split(' ')[0] + ' ';
    return `console.log('%c${iconText}' + ${message}, '${style}');\n`;
  }
  
  // Update toolbox
  const toolboxXml = `
    <xml>
      <category name="Motion" colour="160">
        <block type="move_steps"></block>
        <block type="turn_right"></block>
        <block type="turn_left"></block>
        <block type="set_xy"></block>
      </category>
      <category name="Looks" colour="20">
        <block type="say"></block>
        <block type="change_size"></block>
      </category>
      <category name="Control" colour="120">
        <block type="start"></block>
        <block type="wait_seconds"></block>
      </category>
    </xml>
  `
  
  workspace.updateToolbox(toolboxXml)
  log('Default blocks registered')
}

// Parse JSON block definitions
async function applyBlockJson(content, opts = {}){
  try{
    const payload = JSON.parse(content)
    if(!payload) throw new Error('Invalid blocks file')
    
    // Register blocks from categories
    if(Array.isArray(payload.categories)){
      log('Loading ' + payload.categories.length + ' categories')
      
      let toolboxXml = '<xml>'
      for(const cat of payload.categories){
        if(cat.blocks) registerBlocksArray(cat.blocks, cat.colour, cat.name)
        
        toolboxXml += `<category name="${escapeXml(cat.name||'Category')}" colour="${cat.colour||'#888'}">`
        for(const b of cat.blocks){
          const blockType = b.type || b.name
          toolboxXml += `<block type="${escapeXml(blockType)}"></block>`
        }
        toolboxXml += `</category>`
      }
      toolboxXml += '</xml>'
      
      workspace.updateToolbox(toolboxXml)
      log('Loaded ' + payload.categories.length + ' categories')
    }
  }catch(e){
    log('Block file parse error: ' + e.message)
    throw e
  }
}

function registerBlocksArray(arr, categoryColour = null, categoryName = null){
  if(!Array.isArray(arr) || arr.length===0) return
  
  const normalized = arr.map(b => {
    const copy = JSON.parse(JSON.stringify(b))
    if(copy.name && !copy.type) copy.type = copy.name
    if(!copy.colour && categoryColour) copy.colour = categoryColour
    
    // Track which category this block belongs to
    if(categoryName && copy.type){
      blockCategoryMap.set(copy.type, categoryName)
    }
    
    // Store original colour for high contrast mode
    if(copy.colour && !copy._originalColour){
      copy._originalColour = copy.colour
    }
    
    // Apply saturated color if in high contrast mode
    if(isHighContrastMode && copy.colour){
      copy.colour = saturateHSL(copy.colour)
    }
    
    // Store original arg data for shadow blocks
    const argDefaults = {}
    const argInfo = {}
    
    // Convert args0 argType to proper Blockly field types
    if(Array.isArray(copy.args0)){
      copy.args0 = copy.args0.map(arg => {
        if(arg.argType === 'value'){
          // Store default value for shadow block
          argDefaults[arg.name] = arg.value !== undefined ? arg.value : 0
          // Store input type information
          argInfo[arg.name] = { input: arg.input || 'text' }
          // Convert to input_value socket (accepts any value block)
          return {
            type: 'input_value',
            name: arg.name,
            check: null // Accepts any value output
          }
        }else if(arg.argType === 'boolean'){
          // Store default value for shadow block (boolean values are in quotes)
          argDefaults[arg.name] = arg.value !== undefined ? arg.value : 'True'
          // Store input type information
          argInfo[arg.name] = { input: arg.input || 'text' }
          // Convert to input_value socket (accepts only boolean blocks)
          return {
            type: 'input_value',
            name: arg.name,
            check: 'Boolean' // Only accepts Boolean output
          }
        }else if(arg.argType === 'dropdown'){
          if(Array.isArray(arg.options)){
            return {
              type: 'field_dropdown',
              name: arg.name,
              options: arg.options.map(opt => [String(opt), String(opt)])
            }
          } else if(typeof arg.options === 'string' && arg.options.startsWith('varible')){
            // Dynamic variable dropdown
            return {
              type: 'field_dropdown',
              name: arg.name,
              options: function() {
                // Get all variables
                const vars = variables || []
                if(vars.length === 0) return [['', '']]
                
                // All variables are value/text type now
                return vars.map(v => [v.name, v.name])
              },
              validator: function(newValue) {
                // Check if the selected variable still exists
                const vars = variables || []
                const exists = vars.some(v => v.name === newValue)
                // If variable doesn't exist, clear the value
                return exists ? newValue : ''
              }
            }
          }
        }
        return arg
      })
      
      // Store defaults and arg info for later use in init function
      if(Object.keys(argDefaults).length > 0){
        copy._argDefaults = argDefaults
        copy._argInfo = argInfo
      }
    }
    
    // Handle shape
    if(copy.shape){
      const sh = String(copy.shape).toLowerCase()
      if(sh === 'start' || sh === 'top'){
        if('previousStatement' in copy) delete copy.previousStatement
        if(!('nextStatement' in copy)) copy.nextStatement = null
        topBlockTypes.add(copy.type)
        // Force inputs to be inline
        copy.inputsInline = true
      }else if(sh === 'middle'){
        if(!('previousStatement' in copy)) copy.previousStatement = null
        if(!('nextStatement' in copy)) copy.nextStatement = null
        // Force inputs to be inline
        copy.inputsInline = true
      }else if(sh === 'value'){
        // Value output block (oval shape) - returns a value that can snap into value inputs
        if('previousStatement' in copy) delete copy.previousStatement
        if('nextStatement' in copy) delete copy.nextStatement
        if(!('output' in copy)) copy.output = null // Can connect to any value input
        // Force inputs to be inline
        copy.inputsInline = true
      }else if(sh === 'boolean'){
        // Boolean output block (hexagonal shape) - returns boolean that can snap into boolean inputs
        if('previousStatement' in copy) delete copy.previousStatement
        if('nextStatement' in copy) delete copy.nextStatement
        copy.output = 'Boolean' // Only connects to boolean inputs
        // Force inputs to be inline
        copy.inputsInline = true
      }else if(sh === 'loop'){
        if(!('previousStatement' in copy)) copy.previousStatement = null
        if(!('nextStatement' in copy)) copy.nextStatement = null
        // Keep inputs inline - statement inputs always appear below regardless
        copy.inputsInline = true
        // Add statement input for nested blocks
        const hasStmtInput = Array.isArray(copy.args0) && copy.args0.some(a=>a && a.type==='input_statement')
        if(!hasStmtInput){
          // Add statement input on a separate message line
          copy.message1 = '%1'
          copy.args1 = [{ type: 'input_statement', name: 'SUBSTACK' }]
        }
      }else if(sh === 'loop+end'){
        // Keep inputs inline - statement inputs always appear below regardless
        copy.inputsInline = true
        if(!('previousStatement' in copy)) copy.previousStatement = null
        if('nextStatement' in copy) delete copy.nextStatement
        const hasStmtInput = Array.isArray(copy.args0) && copy.args0.some(a=>a && a.type==='input_statement')
        if(!hasStmtInput){
          // Add statement input on a separate message line
          copy.message1 = '%1'
          copy.args1 = [{ type: 'input_statement', name: 'SUBSTACK' }]
        }
      }
    }
    
    return copy
  })
  
  for(let blk of normalized){
    try{
      Blockly.defineBlocksWithJsonArray([blk])
      
      // Add custom init to create shadow blocks for value/boolean inputs
      if(blk._argDefaults && Object.keys(blk._argDefaults).length > 0){
        const origInit = Blockly.Blocks[blk.type].init
        Blockly.Blocks[blk.type].init = function(){
          origInit.call(this)
          
          // Add shadow blocks with default values
          for(const [inputName, defaultValue] of Object.entries(blk._argDefaults)){
            const input = this.getInput(inputName)
            if(input && input.type === Blockly.INPUT_VALUE){
              // Get the input type from the stored arg info
              const argInfo = blk._argInfo?.[inputName]
              const inputType = argInfo?.input || 'text'
              
              // Skip creating shadow block if input type is 'none'
              if(inputType === 'none'){
                continue
              }
              
              // Create appropriate shadow block based on check type
              const checkType = input.connection?.check_?.[0]
              let shadowBlock
              
              if(checkType === 'Boolean'){
                // Boolean shadow - create a dropdown field
                shadowBlock = this.workspace.newBlock('boolean')
                shadowBlock.setShadow(true)
                shadowBlock.initSvg()
                shadowBlock.setFieldValue(String(defaultValue), 'state')
              }else{
                // Value shadow - create appropriate field type based on input parameter
                if(inputType === 'numbers'){
                  // Number-only input
                  if(!Blockly.Blocks['math_number']){
                    Blockly.Blocks['math_number'] = {
                      init: function(){
                        this.appendDummyInput().appendField(new Blockly.FieldNumber(0), 'NUM')
                        this.setOutput(true, 'Number')
                        this.setColour(230)
                      }
                    }
                  }
                  shadowBlock = this.workspace.newBlock('math_number')
                  shadowBlock.setShadow(true)
                  shadowBlock.initSvg()
                  shadowBlock.setFieldValue(defaultValue, 'NUM')
                }else if(inputType === 'key'){
                  // Single key input (letter, character, symbol, F keys, modifiers)
                  if(!Blockly.Blocks['key_field']){
                    Blockly.Blocks['key_field'] = {
                      init: function(){
                        this.appendDummyInput().appendField(new Blockly.FieldTextInput('', function(newValue){
                          // Validate: only allow single character or special keys
                          if(newValue.length === 0) return null
                          if(newValue.length === 1) return newValue
                          // Allow special keys like F1-F12, ctrl, shift, alt, etc.
                          const validKeys = /^(F[1-9]|F1[0-2]|ctrl|shift|alt|tab|enter|space|esc|backspace|delete|home|end|pageup|pagedown|up|down|left|right|insert|capslock|numlock|scrolllock|pause|printscreen)$/i
                          if(validKeys.test(newValue)) return newValue.toLowerCase()
                          // Otherwise return just the first character
                          return newValue.charAt(0)
                        }), 'KEY')
                        this.setOutput(true, null)
                        this.setColour(160)
                      }
                    }
                  }
                  shadowBlock = this.workspace.newBlock('key_field')
                  shadowBlock.setShadow(true)
                  shadowBlock.initSvg()
                  shadowBlock.setFieldValue(String(defaultValue), 'KEY')
                }else{
                  // Text input (numbers, characters, and symbols)
                  if(!Blockly.Blocks['text_field']){
                    Blockly.Blocks['text_field'] = {
                      init: function(){
                        this.appendDummyInput().appendField(new Blockly.FieldTextInput(''), 'TEXT')
                        this.setOutput(true, null)
                        this.setColour(160)
                      }
                    }
                  }
                  shadowBlock = this.workspace.newBlock('text_field')
                  shadowBlock.setShadow(true)
                  shadowBlock.initSvg()
                  shadowBlock.setFieldValue(String(defaultValue), 'TEXT')
                }
              }
              
              // Only connect if not already connected
              if(!input.connection.targetConnection){
                input.connection.connect(shadowBlock.outputConnection)
              }else{
                // Shadow block not needed, dispose it
                shadowBlock.dispose()
              }
            }
          }
        }
      }
      
      // Auto-generate server-backed generator if not exists
      if(!Blockly.JavaScript[blk.type]){
        const t = blk.type
        
        // For loop blocks with SUBSTACK
        if(blk.shape === 'loop' || blk.shape === 'loop+end'){
          Blockly.JavaScript[t] = function(block){
            const fields = {}
            const args = blk.args0 || []
            for(const a of args){
              if(a && a.name && a.type !== 'input_statement'){
                try{
                  fields[a.name] = block.getFieldValue(a.name)
                }catch(e){}
              }
            }
            
            // Get nested blocks
            let innerCode = ''
            const sub = block.getInputTargetBlock && block.getInputTargetBlock('SUBSTACK')
            if(sub){
              let cur = sub
              while(cur){
                let c = Blockly.JavaScript.blockToCode(cur)
                if(Array.isArray(c)) c = c[0] || ''
                innerCode += (c || '')
                cur = cur.getNextBlock && cur.getNextBlock()
              }
            }
            
            // Return code that calls server and executes nested blocks
            return `await fetch('/api/run_block', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ type: '${t}', fields: ${JSON.stringify(fields)} }) });\n${innerCode}\n`
          }
        }else{
          // Regular block
          Blockly.JavaScript[t] = function(block){
            const fields = {}
            const args = blk.args0 || []
            for(const a of args){
              if(a && a.name){
                try{
                  fields[a.name] = block.getFieldValue(a.name)
                }catch(e){}
              }
            }
            return `await fetch('/api/run_block', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ type: '${t}', fields: ${JSON.stringify(fields)} }) });\n`
          }
        }
      }
    }catch(e){
      console.warn('defineBlocks failed for', blk.type, e)
    }
  }
}

function escapeXml(s){
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/* Runtime object */
function makeRuntime(sprite){
  return {
    sprite,
    wait: async (sec)=>{
      const ms = sec*1000
      const start = Date.now()
      while(Date.now() - start < ms){ 
        if(stopped) throw new Error('stopped'); 
        await sleep(20) 
      }
    }
  }
}

// Sprite API
function spriteAPI(s){
  return {
    move: async (steps)=>{
      if(stopped) throw new Error('stopped');
      const px = steps * 5
      const startX = s.x, startY = s.y
      const rad = s.angle * Math.PI/180
      const targetX = startX + Math.cos(rad) * px
      const targetY = startY + Math.sin(rad) * px
      const duration = 300
      const start = Date.now()
      while(Date.now()-start < duration){
        if(stopped) throw new Error('stopped');
        const t = (Date.now()-start)/duration
        s.x = startX + (targetX-startX) * t
        s.y = startY + (targetY-startY) * t
        drawStage();
        await sleep(16)
      }
      s.x = targetX; s.y = targetY; drawStage();
    },
    turn: (deg)=>{ s.angle = (s.angle + deg) % 360; drawStage() },
    setXY: (x,y)=>{ s.x = x; s.y = y; drawStage() },
    say: (text, sec)=>{ 
      s.say = text; drawStage(); 
      setTimeout(()=>{ s.say=''; drawStage() }, sec*1000) 
    },
    changeSize: (amt)=>{ s.size = Math.max(0.1, s.size + amt/100); drawStage() }
  }
}

/* Run all start blocks */
async function runAllStarts(){
  if(running) return log('Program already running')
  if(!workspace) return log('No workspace available')
  
  const all = workspace.getAllBlocks(false) || []
  let starts = all.filter(b => topBlockTypes.has(b.type) && !b.getPreviousBlock())
  
  if(starts.length === 0){
    const fallback = all.filter(b => (b.type === 'start' || b.type === 'Start') && !b.getPreviousBlock())
    if(fallback.length > 0) starts = fallback
  }
  
  if(starts.length === 0){
    log('No start blocks found')
    return
  }
  
  await runUserCode(async ()=>{
    const sprite = sprites[currentSpriteIndex]
    const runtime = makeRuntime(sprite)
    runtime.sprite = spriteAPI(sprite)
    
    for(const st of starts){
      try{
        log('Running start block: ' + st.type)
        let next = st.getNextBlock()
        if(!next){ log('Start block has no child blocks'); continue }
        
        while(next){
          await executeSingleBlock(next, runtime)
          if(stopped) break
          next = next.getNextBlock()
        }
        if(stopped) break
      }catch(e){ log('Error running start stack: ' + String(e)) }
    }
  })
}

/* Theme management */
function applyTheme(dark) {
  isDarkMode = dark
  
  if (dark) {
    document.body.classList.remove('light-mode')
  } else {
    document.body.classList.add('light-mode')
  }
  
  if (workspace && workspace.setTheme) {
    const newTheme = Blockly.Theme.defineTheme('customTheme', {
      'base': Blockly.Themes.Classic,
      'componentStyles': {
        'workspaceBackgroundColour': isDarkMode ? '#1e2532' : '#ffffff',
        'toolboxBackgroundColour': isDarkMode ? '#161b28' : '#d8d8d8',
        'toolboxForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutBackgroundColour': isDarkMode ? '#2a3544' : '#f5f5f5',
        'flyoutForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutOpacity': 1,
        'scrollbarColour': '#555555',
        'scrollbarOpacity': 0.4,
      }
    })
    workspace.setTheme(newTheme)
  }
  
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

// Helper function to saturate HSL colors for high contrast mode
function saturateHSL(colour) {
  if (!colour) return colour
  
  // If it's already a saturated color from our theme, return it
  if (typeof colour === 'string' && colour.includes('hsl')) {
    return colour
  }
  
  // Convert Blockly hue (0-360) to HSL with 100% saturation
  const hue = parseInt(colour)
  if (isNaN(hue)) return colour
  
  // Use high saturation and medium-high lightness for better visibility
  return `hsl(${hue}, 100%, 50%)`
}

/* Block colour mode management */
function setBlockColourMode(mode) {
  localStorage.setItem('blockColourMode', mode)
  isHighContrastMode = (mode === 'highContrast')
  
  // Set data attribute on body for CSS styling
  if (mode === 'highContrast') {
    document.body.setAttribute('data-block-colour', 'highContrast')
  } else {
    document.body.removeAttribute('data-block-colour')
  }
  
  if (!workspace) return
  
  // Get all blocks in workspace (exclude shadow blocks)
  const allBlocks = workspace.getAllBlocks(false)
  
  allBlocks.forEach(block => {
    // Skip shadow blocks
    if (block.isShadow()) return
    
    if (!block.type) return
    
    // Store original colour if not already stored
    if (!block._originalColour && block.colour_) {
      block._originalColour = block.colour_
    }
    
    if (mode === 'highContrast') {
      // Get original color and apply saturation
      let originalColour = block._originalColour || block.colour_
      let saturatedColour = saturateHSL(originalColour)
      block.setColour(saturatedColour)
    } else {
      // Restore original colour
      if (block._originalColour) {
        block.setColour(block._originalColour)
      }
    }
  })
  
  // Update theme to use saturated colors
  if (mode === 'highContrast') {
    const saturatedTheme = Blockly.Theme.defineTheme('saturatedTheme', {
      'base': Blockly.Themes.Classic,
      'blockStyles': {
        'colour_blocks': {
          'colourPrimary': '#FF6680',
          'colourSecondary': '#FF4D6A',
          'colourTertiary': '#000000'
        },
        'list_blocks': {
          'colourPrimary': '#FF6680',
          'colourSecondary': '#FF4D6A',
          'colourTertiary': '#000000'
        },
        'logic_blocks': {
          'colourPrimary': '#5CB1D6',
          'colourSecondary': '#47A8D1',
          'colourTertiary': '#000000'
        },
        'loop_blocks': {
          'colourPrimary': '#5CB1D6',
          'colourSecondary': '#47A8D1',
          'colourTertiary': '#000000'
        },
        'math_blocks': {
          'colourPrimary': '#5CB1D6',
          'colourSecondary': '#47A8D1',
          'colourTertiary': '#000000'
        },
        'procedure_blocks': {
          'colourPrimary': '#9966FF',
          'colourSecondary': '#855CD6',
          'colourTertiary': '#000000'
        },
        'text_blocks': {
          'colourPrimary': '#59C059',
          'colourSecondary': '#46B946',
          'colourTertiary': '#000000'
        },
        'variable_blocks': {
          'colourPrimary': '#FF8C1A',
          'colourSecondary': '#FF8000',
          'colourTertiary': '#000000'
        },
      },
      'componentStyles': {
        'workspaceBackgroundColour': isDarkMode ? '#1e2532' : '#ffffff',
        'toolboxBackgroundColour': isDarkMode ? '#161b28' : '#d8d8d8',
        'toolboxForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutBackgroundColour': isDarkMode ? '#2a3544' : '#f5f5f5',
        'flyoutForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutOpacity': 1,
        'scrollbarColour': '#555555',
        'scrollbarOpacity': 0.4,
      }
    })
    if (workspace.setTheme) {
      workspace.setTheme(saturatedTheme)
    }
  } else {
    // Restore original theme
    const customTheme = Blockly.Theme.defineTheme('customTheme', {
      'base': Blockly.Themes.Classic,
      'componentStyles': {
        'workspaceBackgroundColour': isDarkMode ? '#1e2532' : '#ffffff',
        'toolboxBackgroundColour': isDarkMode ? '#161b28' : '#d8d8d8',
        'toolboxForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutBackgroundColour': isDarkMode ? '#2a3544' : '#f5f5f5',
        'flyoutForegroundColour': isDarkMode ? '#ffffff' : '#000000',
        'flyoutOpacity': 1,
        'scrollbarColour': isDarkMode ? '#555555' : '#888888',
        'scrollbarOpacity': 0.4,
        'insertionMarkerColour': '#ffffff',
        'insertionMarkerOpacity': 0.3,
        'cursorColour': '#555555'
      }
    })
    if (workspace.setTheme) {
      workspace.setTheme(customTheme)
    }
  }
  
  // No need to force render - theme change handles it
}

/* Dropdown menu functionality */
function setupDropdowns() {
  // Toggle dropdown visibility
  document.querySelectorAll('.dropdown-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const dropdown = btn.parentElement
      const isActive = dropdown.classList.contains('active')
      
      // Close all dropdowns
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'))
      
      // Toggle current dropdown
      if (!isActive) {
        dropdown.classList.add('active')
      }
    })
  })
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'))
  })
  
  // File menu handlers
  const fileNew = document.getElementById('fileNew')
  const fileLoad = document.getElementById('fileLoad')
  const fileSave = document.getElementById('fileSave')
  
  if (fileNew) {
    fileNew.addEventListener('click', () => {
      if (confirm('Clear all blocks and start a new project?')) {
        if (workspace) {
          workspace.clear()
          log('New project created')
        }
      }
    })
  }
  
  if (fileLoad) {
    fileLoad.addEventListener('click', async () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.xml'
      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        try {
          const text = await file.text()
          
          if (file.name.endsWith('.json')) {
            // Load JSON workspace
            const data = JSON.parse(text)
            if (data.blocks) {
              workspace.clear()
              const xml = Blockly.Xml.textToDom(data.blocks)
              Blockly.Xml.domToWorkspace(xml, workspace)
              log('Loaded project from: ' + file.name)
            }
          } else if (file.name.endsWith('.xml')) {
            // Load XML workspace
            workspace.clear()
            const xml = Blockly.Xml.textToDom(text)
            Blockly.Xml.domToWorkspace(xml, workspace)
            log('Loaded blocks from: ' + file.name)
          }
        } catch (err) {
          log('Error loading file: ' + err.message)
          alert('Error loading file: ' + err.message)
        }
      }
      input.click()
    })
  }
  
  if (fileSave) {
    fileSave.addEventListener('click', () => {
      try {
        const xml = Blockly.Xml.workspaceToDom(workspace)
        const xmlText = Blockly.Xml.domToText(xml)
        
        const data = {
          blocks: xmlText,
          timestamp: new Date().toISOString()
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'macro-project-' + Date.now() + '.json'
        a.click()
        URL.revokeObjectURL(url)
        
        log('Project saved to: ' + a.download)
      } catch (err) {
        log('Error saving file: ' + err.message)
        alert('Error saving file: ' + err.message)
      }
    })
  }
  
  // Settings modal functionality
  setupSettingsModal()
}

/* Settings Modal */
function setupSettingsModal() {
  const settingsBtn = document.getElementById('settingsBtn')
  const settingsModal = document.getElementById('settingsModal')
  const settingsClose = document.querySelector('.settings-close')
  const categoryBtns = document.querySelectorAll('.settings-category-btn')
  const panels = document.querySelectorAll('.settings-panel')
  
  // Open modal
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (settingsModal) {
        settingsModal.classList.add('active')
      }
      // Close any open dropdowns
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'))
    })
  }
  
  // Close modal
  const closeModal = () => {
    if (settingsModal) {
      settingsModal.classList.remove('active')
    }
  }
  
  if (settingsClose) {
    settingsClose.addEventListener('click', closeModal)
  }
  
  // Close on background click
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeModal()
      }
    })
  }
  
  // Category switching
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category')
      
      // Update active states
      categoryBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      
      panels.forEach(panel => {
        if (panel.getAttribute('data-panel') === category) {
          panel.classList.add('active')
        } else {
          panel.classList.remove('active')
        }
      })
    })
  })
  
  // Settings option handlers
  const settingsLight = document.getElementById('settingsLight')
  const settingsDark = document.getElementById('settingsDark')
  const blockColourOriginal = document.getElementById('blockColourOriginal')
  const blockColourHighContrast = document.getElementById('blockColourHighContrast')
  
  if (settingsLight) {
    settingsLight.addEventListener('click', () => {
      applyTheme(false)
      log('Switched to Light Mode')
    })
  }
  
  if (settingsDark) {
    settingsDark.addEventListener('click', () => {
      applyTheme(true)
      log('Switched to Dark Mode')
    })
  }
  
  if (blockColourOriginal) {
    blockColourOriginal.addEventListener('click', () => {
      setBlockColourMode('original')
      log('Block colours set to: Original')
    })
  }
  
  if (blockColourHighContrast) {
    blockColourHighContrast.addEventListener('click', () => {
      setBlockColourMode('highContrast')
      log('Block colours set to: High Contrast')
    })
  }
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal && settingsModal.classList.contains('active')) {
      closeModal()
    }
  })
}

/* Display source selector using agent */
let currentStream = null

async function setupDisplaySelector() {
  const selector = document.getElementById('displaySource')
  const img = document.getElementById('displayImage')
  const refreshBtn = document.getElementById('refreshSources')
  const noSourceMsg = document.getElementById('noSourceMessage')
  
  if (!selector || !img) return
  
  // Function to populate all available sources from agent
  async function populateSources() {
    const screenGroup = document.getElementById('screenGroup')
    const appGroup = document.getElementById('appGroup')
    const cameraGroup = document.getElementById('cameraGroup')
    
    if (!screenGroup || !appGroup || !cameraGroup) return
    
    // Clear existing options
    screenGroup.innerHTML = ''
    appGroup.innerHTML = ''
    cameraGroup.innerHTML = ''
    
    try {
      // Get sources from agent
      const response = await fetch('http://localhost:9001/display/sources')
      if (!response.ok) {
        log('⚠️ Agent not connected - cannot get display sources')
        return
      }
      
      const sources = await response.json()
      
      // Add screens
      sources.screens?.forEach(screen => {
        const option = document.createElement('option')
        option.value = screen.id
        option.textContent = `🖥️ ${screen.name} (${screen.width}×${screen.height})`
        screenGroup.appendChild(option)
      })
      
      // Add windows/apps
      sources.windows?.forEach(window => {
        const option = document.createElement('option')
        option.value = window.id
        option.textContent = `📱 ${window.name}`
        appGroup.appendChild(option)
      })
      
      // Add cameras
      sources.cameras?.forEach(camera => {
        const option = document.createElement('option')
        option.value = camera.id
        option.textContent = `📷 ${camera.name}`
        cameraGroup.appendChild(option)
      })
      
      log(`✓ Found ${sources.screens?.length || 0} screens, ${sources.windows?.length || 0} windows, ${sources.cameras?.length || 0} cameras`)
    } catch (err) {
      console.error('Error getting display sources:', err)
      log('❌ Failed to get display sources from agent')
    }
  }
  
  // Initial population
  await populateSources()
  
  // Refresh button handler
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      log('Refreshing sources...')
      await populateSources()
    })
  }
  
  // Handle source change
  selector.addEventListener('change', async () => {
    const value = selector.value
    
    if (!value) {
      // Clear display
      img.src = ''
      img.style.display = 'none'
      if (noSourceMsg) noSourceMsg.style.display = 'block'
      return
    }
    
    try {
      // Set source on agent
      const response = await fetch('http://localhost:9001/display/set-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: value })
      })
      
      if (!response.ok) {
        log('❌ Failed to set display source')
        return
      }
      
      // Start streaming from agent
      img.src = 'http://localhost:9001/display/stream?' + new Date().getTime()
      img.style.display = 'block'
      if (noSourceMsg) noSourceMsg.style.display = 'none'
      
      log(`✓ Displaying: ${selector.options[selector.selectedIndex].textContent}`)
      
    } catch (err) {
      console.error('Display source error:', err)
      log('❌ Error: ' + err.message)
    }
  })
}

/* App boot */
async function boot(){
  try{
    await initBlockly()
  }catch(e){
    console.warn('initBlockly threw', e)
    log('initBlockly error: ' + (e && e.message ? e.message : String(e)))
  }
  
  // Start agent connection check
  startAgentCheck()
  
  // Setup dropdown menus
  setupDropdowns()
  
  // Setup display source selector
  setupDisplaySelector()
  
  // Setup variables UI
  setupVariablesUI()
  
  // Setup plugins modal
  setupPluginsModal()
  
  // Create initial sprite
  createSprite()
  
  // Start/Stop button
  const startBtn = document.getElementById('startAll')
  if(startBtn){
    startBtn.onclick = ()=>{
      if(running){
        stopAll()
      }else{
        // Check if any blocks require agent
        const allBlocks = workspace.getAllBlocks(false)
        const needsAgent = allBlocks.some(blk => blockNeedsAgent(blk.type))
        
        if (needsAgent && !agentConnected) {
          showAgentWarning()
          log('⚠️ Agent not connected. Please download and run the agent.')
          return
        }
        
        log('Start pressed')
        runAllStarts()
      }
    }
  }
  
  // Click-to-run toggle
  const clickToggle = document.getElementById('clickRunToggle')
  if(clickToggle){
    const updateToggleStyle = ()=>{
      clickToggle.innerText = 'Click→Run: ' + (CLICK_TO_RUN_ENABLED ? 'ON' : 'OFF')
      if(CLICK_TO_RUN_ENABLED){
        clickToggle.style.background = '#40BF4A'
        clickToggle.style.fontWeight = '600'
      }else{
        clickToggle.style.background = '#e74c3c'
        clickToggle.style.fontWeight = '400'
      }
    }
    clickToggle.onclick = ()=>{
      CLICK_TO_RUN_ENABLED = !CLICK_TO_RUN_ENABLED
      updateToggleStyle()
      log('Click-to-run: ' + (CLICK_TO_RUN_ENABLED ? 'enabled' : 'disabled'))
    }
    updateToggleStyle()
  }
  
  // Apply saved theme
  applyTheme(isDarkMode)
  
  // High contrast mode is already applied during workspace init
  // Body attribute was set at page load
  
  // Setup console panel
  setupConsolePanel()
  
  // Keyboard shortcut: R key
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'r' || e.key === 'R'){
      if(e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      e.preventDefault()
      if(running) stopAll()
      else runAllStarts()
    }
  })
}

/* Console Panel Management */
let currentConsoleFilter = 'all'

function setupConsolePanel() {
  const toggleBtn = document.getElementById('toggleConsole')
  const closeBtn = document.getElementById('closeConsole')
  const clearBtn = document.getElementById('clearConsole')
  const consolePanel = document.getElementById('consolePanel')
  const filterBtns = document.querySelectorAll('.console-filter-btn')
  
  if (!toggleBtn || !consolePanel) return
  
  toggleBtn.addEventListener('click', () => {
    consolePanel.classList.toggle('open')
  })
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      consolePanel.classList.remove('open')
    })
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const output = document.getElementById('consoleOutput')
      if (output) output.innerHTML = ''
    })
  }
  
  // Setup filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filterBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      
      // Get filter type
      currentConsoleFilter = btn.dataset.filter
      
      // Apply filter
      applyConsoleFilter()
    })
  })
}

// Function to add output to console
function addConsoleOutput(message, type = 'log') {
  const output = document.getElementById('consoleOutput')
  if (!output) return
  
  const entry = document.createElement('div')
  entry.className = `console-entry ${type}`
  
  const icon = document.createElement('span')
  icon.className = 'console-entry-icon'
  
  // Set icon based on type
  switch(type) {
    case 'warn':
      icon.textContent = '⚠️'
      break
    case 'error':
      icon.textContent = '❌'
      break
    case 'red':
    case 'green':
    case 'blue':
      icon.textContent = '●'
      break
    default:
      icon.textContent = '▸'
  }
  
  const text = document.createElement('span')
  text.className = 'console-entry-text'
  text.textContent = message
  
  entry.appendChild(icon)
  entry.appendChild(text)
  output.appendChild(entry)
  
  // Apply current filter to new entry
  if (currentConsoleFilter !== 'all' && !entry.classList.contains(currentConsoleFilter)) {
    entry.classList.add('hidden')
  }
  
  // Auto-scroll to bottom
  output.scrollTop = output.scrollHeight
  
  // Auto-open console when output is added
  const consolePanel = document.getElementById('consolePanel')
  if (consolePanel && !consolePanel.classList.contains('open')) {
    consolePanel.classList.add('open')
  }
}

// Make it available globally for Python execution
window.addConsoleOutput = addConsoleOutput

/* Plugins Management */
function setupPluginsModal() {
  const pluginsBtn = document.getElementById('pluginsBtn')
  const modal = document.getElementById('pluginsModal')
  const closeBtn = document.getElementById('pluginsModalClose')
  const pluginsList = document.getElementById('pluginsList')
  
  if (!pluginsBtn || !modal || !pluginsList) return
  
  // Open modal
  pluginsBtn.addEventListener('click', () => {
    renderPluginsList()
    modal.style.display = 'block'
  })
  
  // Close modal
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none'
  })
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none'
    }
  })
  
  function renderPluginsList() {
    pluginsList.innerHTML = ''
    
    // Filter to only plugin state categories
    const plugins = allCategories.filter(cat => cat.state === 'plugin')
    
    if (plugins.length === 0) {
      pluginsList.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem;">No plugin categories found.</p>'
      return
    }
    
    plugins.forEach(plugin => {
      const isEnabled = enabledPlugins.includes(plugin.fileName)
      
      const item = document.createElement('div')
      item.className = 'plugin-item' + (isEnabled ? ' active' : '')
      
      const info = document.createElement('div')
      info.className = 'plugin-info'
      
      const name = document.createElement('div')
      name.className = 'plugin-name'
      
      const colourBox = document.createElement('span')
      colourBox.className = 'plugin-colour'
      colourBox.style.background = plugin.colour || '#888'
      
      const nameText = document.createElement('span')
      nameText.textContent = plugin.name || 'Unnamed'
      
      name.appendChild(colourBox)
      name.appendChild(nameText)
      
      const blocksCount = document.createElement('div')
      blocksCount.className = 'plugin-blocks-count'
      blocksCount.textContent = `${plugin.blocks.length} block${plugin.blocks.length !== 1 ? 's' : ''}`
      
      info.appendChild(name)
      info.appendChild(blocksCount)
      
      const toggleBtn = document.createElement('button')
      toggleBtn.className = 'plugin-toggle ' + (isEnabled ? 'remove' : 'add')
      toggleBtn.textContent = isEnabled ? 'Remove' : 'Add'
      
      toggleBtn.addEventListener('click', async () => {
        if (isEnabled) {
          // Remove plugin
          enabledPlugins = enabledPlugins.filter(p => p !== plugin.fileName)
        } else {
          // Add plugin
          enabledPlugins.push(plugin.fileName)
        }
        
        // Save to localStorage
        localStorage.setItem('enabledPlugins', JSON.stringify(enabledPlugins))
        
        // Reload blocks
        await loadBlocksFromJson()
        
        // Re-render list
        renderPluginsList()
        
        log(`Plugin ${isEnabled ? 'removed' : 'added'}: ${plugin.name}`)
      })
      
      item.appendChild(info)
      item.appendChild(toggleBtn)
      pluginsList.appendChild(item)
    })
  }
}

window.addEventListener('load', boot)
