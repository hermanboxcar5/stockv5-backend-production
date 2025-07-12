const { createClient } = require('@supabase/supabase-js')




const supabaseUrl = process.env["SUPAURL"]
const supabaseKey = process.env["SUPAKEY"]

const supabase = createClient(supabaseUrl, supabaseKey)

let slib = {}

slib.tables = {}

slib.tables.orgdata = "orgsdata"
slib.tables.invitedata = "invites"
slib.tables.usrfdata = "users"

slib.parseRawData = function(data, error){
  let res = {}
  res.success = !error
  if(res.success){
    res.data=data
  } else {
    res.error = error
  }
  return res
}

slib.organizations = {}

slib.organizations.create = async function (initialData = {}) {
  let { data, error } = await supabase
    .from(slib.tables.orgdata)
    .insert([{ data: initialData }])
    .select('id')
    .single()
  return slib.parseRawData(data, error)
}

slib.organizations.read = async function (orgId) {
  const { data, error } = await supabase
    .from(slib.tables.orgdata)
    .select('data')
    .eq('id', orgId)
    .single()
  return slib.parseRawData(data, error)
}

slib.organizations.write = async function (orgId, newData) {
  const { data, error } = await supabase
    .from(slib.tables.orgdata)
    .update({ data: newData })
    .eq('id', orgId)
    .select()
    .single()

  return slib.parseRawData(data, error)
}

slib.organizations.delete = async function (orgId) {
  const { data, error } = await supabase
    .from(slib.tables.orgdata)
    .delete()
    .eq('id', orgId)

  return slib.parseRawData(data, error)
}

slib.organizations.exists = async function (orgId) {
  const { data, error } = await supabase
    .from(slib.tables.orgdata)
    .select('id')
    .eq('id', orgId)
    .maybeSingle()

  return slib.parseRawData(!!data, error)
}

slib.invites = {}

slib.invites.list = async function (orgId) {
  const { data, error } = await supabase
    .from(slib.tables.invitedata)
    .select('invite, role')
    .eq('org_id', orgId);

  return slib.parseRawData(data, error)
}

slib.invites.create = async function (orgId, role = 'member') {
  const { data, error } = await supabase
    .from(slib.tables.invitedata)
    .insert([{ org_id: orgId, role }])
    .select('invite')
    .single();

  return slib.parseRawData(data, error)
}

slib.invites.delete = async function (inviteCode) {
  const { data, error } = await supabase
    .from(slib.tables.invitedata)
    .delete()
    .eq('invite', inviteCode);

  return slib.parseRawData(data, error)
}


slib.invites.info = async function (inviteCode) {
  const { data, error } = await supabase
    .from(slib.tables.invitedata)
    .select('org_id, role')
    .eq('invite', inviteCode)
    .single();

  return slib.parseRawData(data, error)
}


slib.auth = {}

slib.auth.getuser = async function (accessToken) {
  if (!accessToken) return {success:false, error:"No Token", data:{}};

  const { data:user , error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return {success:false, error:"Invalid Token", data:{}}
  }
  return {success:true, data:user}
}

slib.usrf = {}

slib.usrf.create = async function (userId, orgId, role = 'member') {
  const { data, error } = await supabase
    .from(slib.tables.usrfdata)
    .insert([{ user_id: userId, org_id: orgId, role }]);

  return slib.parseRawData(data, error)
}

slib.usrf.get = async function (userId, orgId) {
  const { data, error } = await supabase
    .from(slib.tables.usrfdata)
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single();

  return slib.parseRawData(data, error)
}

slib.usrf.update = async function (orgId, userId, newRole) {
  const { data, error } = await supabase
    .from(slib.tables.usrfdata)
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('org_id', orgId);

  return slib.parseRawData(data, error)
}

slib.usrf.delete = async function (orgId, userId) {
  const { data, error } = await supabase
    .from(slib.tables.usrfdata)
    .delete()
    .eq('user_id', userId)
    .eq('org_id', orgId);

  return slib.parseRawData(data, error)
}

slib.usrf.listByUser = async function (userId) {
  const { data, error } = await supabase
    .from(slib.tables.usrfdata)
    .select('org_id, role')
    .eq('user_id', userId);

  if (error) return { success: false, error };

  const orgRoles = {};
  for (const row of data) {
    orgRoles[row.org_id] = row.role;
  }

  return slib.parseRawData(orgRoles, error)
}

slib.usrf.listByOrg = async function (orgId) {
  const { data, error } = await supabase
    .from(slib.tables.usrfdata)
    .select('user_id, role')
    .eq('org_id', orgId);

  return slib.parseRawData(data, error)
}





slib.claims = {}

slib.claims.create = async function (orgId, claimData) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.claims) orgData.claims = {}
  
  const claimId = `CLAIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  orgData.claims[claimId] = {
    id: claimId,
    name: claimData.name,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: claimData.createdBy,
    data: claimData.data || {}
  }
  console.log("starting write")
  return await slib.organizations.write(orgId, orgData)
}

slib.claims.modify = async function (orgId, claimId, newData) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.claims || !orgData.claims[claimId]) {
    return { success: false, error: 'Claim not found' }
  }
  
  // Only allow modifying data, not status
  orgData.claims[claimId].data = newData
  orgData.claims[claimId].modifiedAt = new Date().toISOString()
  
  return await slib.organizations.write(orgId, orgData)
}

slib.claims.approve = async function (orgId, claimId, approvedBy) {
  console.log("approve req received")
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.claims || !orgData.claims[claimId]) {
    return { success: false, error: 'Claim not found' }
  }
  
  const claim = orgData.claims[claimId]
  
  // Update warehouse stock for each item in the claim (subtract quantities)
  if (!orgData.warehouse) orgData.warehouse = {}
  
  // Load VEX parts data for new items
  try {
    const vexResponse = await fetch('https://stockv5-backend.vercel.app/vex.json')
    const vexData = await vexResponse.json()
    
    for (const item of claim.data.items) {
      if (!orgData.warehouse[item.sku]) {
        // Create new warehouse entry with VEX data
        const vexPart = vexData[item.sku]
        if (vexPart) {
          orgData.warehouse[item.sku] = {
            ...vexPart,
            inventoryStock: 0
          }
        }
      }
      
      // Subtract claim quantity from warehouse stock
      if (orgData.warehouse[item.sku]) {
        orgData.warehouse[item.sku].inventoryStock = (orgData.warehouse[item.sku].inventoryStock || 0) - item.quantity
      }
    }
  } catch (error) {
    console.error('Failed to fetch VEX data:', error)
  }
  
  // Update claim status
  orgData.claims[claimId].status = 'approved'
  orgData.claims[claimId].approvedAt = new Date().toISOString()
  orgData.claims[claimId].approvedBy = approvedBy
  
  return await slib.organizations.write(orgId, orgData)
}

slib.claims.delete = async function (orgId, claimId) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.claims || !orgData.claims[claimId]) {
    return { success: false, error: 'Claim not found' }
  }
  
  delete orgData.claims[claimId]
  
  return await slib.organizations.write(orgId, orgData)
}

slib.claims.list = async function (orgId) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const claims = orgResult.data.data.claims || {}
  return { success: true, data: Object.values(claims) }
}

slib.deposits = {}

slib.deposits.create = async function (orgId, depositData) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.deposits) orgData.deposits = {}
  
  const depositId = `DEPOSIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  orgData.deposits[depositId] = {
    id: depositId,
    name: depositData.name,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: depositData.createdBy,
    data: depositData.data || {}
  }
  
  return await slib.organizations.write(orgId, orgData)
}

slib.deposits.modify = async function (orgId, depositId, newData) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.deposits || !orgData.deposits[depositId]) {
    return { success: false, error: 'Deposit not found' }
  }
  
  orgData.deposits[depositId].data = newData
  orgData.deposits[depositId].modifiedAt = new Date().toISOString()
  
  return await slib.organizations.write(orgId, orgData)
}

slib.deposits.approve = async function (orgId, depositId, approvedBy) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.deposits || !orgData.deposits[depositId]) {
    return { success: false, error: 'Deposit not found' }
  }
  
  const deposit = orgData.deposits[depositId]
  
  // Update warehouse stock for each item in the deposit (add quantities)
  if (!orgData.warehouse) orgData.warehouse = {}
  
  // Load VEX parts data for new items
  try {
    const vexResponse = await fetch('https://stockv5-backend.vercel.app/vex.json')
    const vexData = await vexResponse.json()
    
    for (const item of deposit.data.items) {
      if (!orgData.warehouse[item.sku]) {
        // Create new warehouse entry with VEX data
        const vexPart = vexData[item.sku]
        if (vexPart) {
          orgData.warehouse[item.sku] = {
            ...vexPart,
            inventoryStock: 0
          }
        }
      }
      
      // Add deposit quantity to warehouse stock
      if (orgData.warehouse[item.sku]) {
        orgData.warehouse[item.sku].inventoryStock = (orgData.warehouse[item.sku].inventoryStock || 0) + item.quantity
      }
    }
  } catch (error) {
    console.error('Failed to fetch VEX data:', error)
  }
  
  // Update deposit status
  orgData.deposits[depositId].status = 'approved'
  orgData.deposits[depositId].approvedAt = new Date().toISOString()
  orgData.deposits[depositId].approvedBy = approvedBy
  
  return await slib.organizations.write(orgId, orgData)
}

slib.deposits.delete = async function (orgId, depositId) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.deposits || !orgData.deposits[depositId]) {
    return { success: false, error: 'Deposit not found' }
  }
  
  delete orgData.deposits[depositId]
  
  return await slib.organizations.write(orgId, orgData)
}

slib.deposits.list = async function (orgId) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const deposits = orgResult.data.data.deposits || {}
  return { success: true, data: Object.values(deposits) }
}

slib.shoppinglists = {}

slib.shoppinglists.create = async function (orgId, listData) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.shoppinglists) orgData.shoppinglists = {}
  
  const listId = `LIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  orgData.shoppinglists[listId] = {
    id: listId,
    name: listData.name,
    createdAt: new Date().toISOString(),
    createdBy: listData.createdBy,
    items: listData.items || []
  }
  
  return await slib.organizations.write(orgId, orgData)
}

slib.shoppinglists.modify = async function (orgId, listId, newData) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.shoppinglists || !orgData.shoppinglists[listId]) {
    return { success: false, error: 'Shopping list not found' }
  }
  
  orgData.shoppinglists[listId] = { ...orgData.shoppinglists[listId], ...newData }
  orgData.shoppinglists[listId].modifiedAt = new Date().toISOString()
  
  return await slib.organizations.write(orgId, orgData)
}

slib.shoppinglists.delete = async function (orgId, listId) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.shoppinglists || !orgData.shoppinglists[listId]) {
    return { success: false, error: 'Shopping list not found' }
  }
  
  delete orgData.shoppinglists[listId]
  
  return await slib.organizations.write(orgId, orgData)
}

slib.shoppinglists.list = async function (orgId) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const lists = orgResult.data.data.shoppinglists || {}
  return { success: true, data: Object.values(lists) }
}

slib.warehouse = {}

slib.warehouse.addItem = async function (orgId, sku) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.warehouse) orgData.warehouse = {}
  
  if (orgData.warehouse[sku]) {
    return {success:false, error:"Item already exists"}
  } else {
    // New item, fetch data from VEX API and add
    try {
      const vexResponse = await fetch('https://stockv5-backend.vercel.app/vex.json')
      const vexData = await vexResponse.json()
      const vexPart = vexData[sku]
      
      if (vexPart) {
        orgData.warehouse[sku] = {
          ...vexPart,
          inventoryStock: 0
        }
      } else {
        return { success: false, error: 'SKU not found in VEX database' }
      }
    } catch (error) {
      return { success: false, error: 'Failed to fetch VEX data' }
    }
  }
  
  return await slib.organizations.write(orgId, orgData)
}

slib.warehouse.removeItem = async function (orgId, sku) {
  const orgResult = await slib.organizations.read(orgId)
  if (!orgResult.success) return orgResult
  
  const orgData = orgResult.data.data
  if (!orgData.warehouse || !orgData.warehouse[sku]) {
    return { success: false, error: 'Item not found in warehouse' }
  }
  
  // Only allow removal if stock is 0
  if (orgData.warehouse[sku].inventoryStock !== 0) {
    return { success: false, error: 'Can only remove items with 0 stock' }
  }
  
  delete orgData.warehouse[sku]
  
  return await slib.organizations.write(orgId, orgData)
}

slib.users = {}

slib.users.listnames = async function (uuids) {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) return { success: false, error };
    
    const nameMap = {};
    for (const user of data.users) {
        if (uuids.includes(user.id)) {
            // Try to get name from user metadata, fallback to email
            const name = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 
                        user.id;
            nameMap[user.id] = name;
        }
    }
    
    return { success: true, data: nameMap };
}







module.exports = slib
