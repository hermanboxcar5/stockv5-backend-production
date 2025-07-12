let express = require("express")
let path = require("path")
let slib = require("./supabase.js");
const cors = require('cors');
let app = express()

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'public')));

// ________________________ API START ________________________
app.post('/api/v1/session/validity', async (req, res) => {
    let user = await slib.auth.getuser(req.body.token)
    res.status(200).end(`${!!user.data}`)
})
app.post('/api/v1/session/info', async (req, res) => {

    let user = await slib.auth.getuser(req.body.token)
    res.json(user)
})

// ##################### Orgs - Start #####################
app.use('/api/v1/orgs', async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1]
    let user = await slib.auth.getuser(token)
    if (!user.data) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user.data.user;
    next();
});

app.post('/api/v1/orgs/create', async (req, res) => {
    if (req.user) {
        let preset = {
            name: req.body.name || "Untitled",
            claims: {},
            warehouse: {},
            shoppinglists: {},
            deposits: {}
        };

        if (req.body.preset && typeof req.body.preset === "object" && !Array.isArray(req.body.preset)) {
            const input = req.body.preset;
            if (input.claims && typeof input.claims === "object" && !Array.isArray(input.claims)) {
                preset.claims = input.claims;
            }
            if (input.warehouse && typeof input.warehouse === "object" && !Array.isArray(input.warehouse)) {
                preset.warehouse = input.warehouse;
            }
            if (input.shoppinglists && typeof input.shoppinglists === "object" && !Array.isArray(input.shoppinglists)) {
                preset.shoppinglists = input.shoppinglists;
            }
            if (input.deposits && typeof input.deposits === "object" && !Array.isArray(input.deposits)) {
                preset.deposits = input.deposits;
            }
        }
        let org = await slib.organizations.create(preset)
        let usrf = await slib.usrf.create(req.user.id, org.data.id, "owner")
        res.status(200).json(org)
    } else {
        res.status(500).json({ success: false, error: 'Something Went Wrong' })
    }
})

app.post('/api/v1/orgs/listusers', async (req, res) => {
    if (req.user && req.body.organization) {
        let roleInOrg = await slib.usrf.get(req.user.id, req.body.organization)
        if (roleInOrg.data.role == "admin" || roleInOrg.data.role == "owner") {
            let data = await slib.usrf.listByOrg(req.body.organization)
            res.status(200).json({ success: true, data: data })
        } else {
            res.status(403).json({ error: 'Forbidden. Elevation needed' })
        }
    } else {
        res.status(500).json({ success: false, error: 'token or organization missing' })
    }
})

app.post('/api/v1/orgs/read', async (req, res) => {
    if (req.user && req.body.organization) {
        let roleInOrg = await slib.usrf.get(req.user.id, req.body.organization)
        console.log(roleInOrg)
        if (roleInOrg.data?.role == "owner" || roleInOrg.data?.role == "admin" || roleInOrg.data?.role == "member") {
            let data = await slib.organizations.read(req.body.organization)
            res.status(200).json({ success: true, data: data })
        } else {
            res.status(403).json({ error: 'Forbidden. Elevation needed' })
        }
    } else {
        res.status(500).json({ success: false, error: 'token or organization missing' })
    }
})

app.post('/api/v1/orgs/exists', async (req, res) => {
    if (req.user && req.body.organization) {
        let info = await slib.organizations.exists(req.body.organization)
        res.status(200).json(info)
    } else {
        res.status(500).json({ success: false, error: 'token or organization missing' })
    }
})

// app.post('/api/v1/orgs/write', async (req, res)=>{
//     if(req.user && req.body.organization && req.body.data){
//         let info = await slib.organizations.write(req.body.organization, req.body.data)
//         res.status(200).json(info)
//     } else {
//         res.status(500).json({ success:false, error: 'token or organization or data missing' })
//     }
// })

app.post('/api/v1/orgs/delete', async (req, res) => {
    if (req.user && req.body.organization) {
        let roleInOrg = await slib.usrf.get(req.user.id, req.body.organization)
        if (roleInOrg.data?.role == "owner") {
            let rem = await slib.organizations.delete(req.body.organization)
            res.status(200).json({ success: true, data: rem })
        } else {
            res.status(403).json({ error: 'Forbidden. Elevation needed' })
        }
    } else {
        res.status(500).json({ error: 'Something Went Wrong. Try including organization in BODY' })
    }
})

// ##################### Invites - Start ######################

app.use('/api/v1/invites', async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1]
    let user = await slib.auth.getuser(token)
    if (!user.data) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user.data.user;
    next();
});

app.post('/api/v1/invites/create', async (req, res) => {
    if (req.user && req.body.organization && req.body.inviterole) {
        let roleInOrg = await slib.usrf.get(req.user.id, req.body.organization)
        if ((roleInOrg.data.role == "owner") || (roleInOrg.data.role == "admin" && req.body.inviterole == "member")) {
            let invite = await slib.invites.create(req.body.organization, req.body.inviterole)
            res.status(200).json(invite)
        } else {
            res.status(403).json({ success: false, error: 'Forbidden. Elevation needed' })
        }
    } else {
        res.status(500).json({ error: 'Something Went Wrong. Try including organization and inviterole in BODY' })
    }
})


app.post('/api/v1/invites/info', async (req, res) => {
    if (req.user && req.body.invitecode) {
        let inviteinfo = await slib.invites.info(req.body.invitecode)
        res.status(200).json(inviteinfo)
    } else {
        res.status(500).json({ success: false, error: 'Something Went Wrong. Try including invitecode in BODY' })
    }
})

app.post('/api/v1/invites/list', async (req, res) => {
    if (req.user && req.body.organization) {
        let roleInOrg = await slib.usrf.get(req.user.id, req.body.organization)
        if (roleInOrg.data.role == "owner") {
            let invites = await slib.invites.list(req.body.organization)
            res.status(200).json(invites)
        } else if (roleInOrg.data.role == "admin") {
            let invites = await slib.invites.list(req.body.organization)
            console.log(invites)
            
            invites.data = invites.data.filter(invite=>invite.role=="member")
            res.status(200).json(invites)
        } else {
            res.status(403).json({ error: 'Forbidden. Elevation needed' })
        }
    } else {
        res.status(500).json({ success: false, error: 'Something Went Wrong. Try including organization in BODY' })
    }
})

app.post('/api/v1/invites/delete', async (req, res) => {
    if (req.user && req.body.invitecode) {
        let inviteinfo = await slib.invites.info(req.body.invitecode)
        let org = inviteinfo.data.org_id
        let roleInOrg = await slib.usrf.get(req.user.id, org)
        if (roleInOrg.data.role == "owner") {
            let deleted = await slib.invites.delete(req.body.invitecode)
            res.status(200).json(deleted)
        } else {
            res.status(403).json({ success: false, error: 'Forbidden. Elevation needed' })
        }
    } else {
        res.status(500).json({ success: false, error: 'Something Went Wrong. Try including invitecode in BODY' })
    }
})


// ##################### Users - Start #####################

app.use('/api/v1/users', async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1]
    let user = await slib.auth.getuser(token)
    if (!user.data) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user.data.user;
    next();
});



app.post('/api/v1/users/listorgs', async (req, res) => {
    if (req.user) {
        let resp = await slib.usrf.listByUser(req.user.id)
        res.status(200).json(resp)
    } else {
        res.status(500).json({ error: 'Something Went Wrong.' })
    }
})


app.post('/api/v1/users/invite', async (req, res) => {
    if (req.user && req.body.invitecode) {
        let inviteinfo = await slib.invites.info(req.body.invitecode)
        let currentrf = await slib.usrf.get(req.user.id, inviteinfo.data.org_id)
        console.log(currentrf)
        if (!currentrf.success) {
            if (inviteinfo.data && (inviteinfo.data.role == "member" || inviteinfo.data.role == "admin") && inviteinfo.data.org_id) {
                let usrf = await slib.usrf.create(req.user.id, inviteinfo.data.org_id, inviteinfo.data.role)
                res.status(200).json(usrf)
            } else {
                res.status(403).json({ error: 'Invite Invalid' })
            }
        } else {
            res.status(403).json({ error: 'User already in Org' })
        }

        console.log(inviteinfo)
    } else {
        res.status(500).json({ error: 'Something Went Wrong. Try including invitecode in BODY' })
    }
})

app.post('/api/v1/users/manage', async (req, res) => {
    let user = await slib.usrf.get(req.user.id, req.body.organization)
    let statusres = { successful: 0, total: req.body.actions.length }
    if (req.user && req.body.organization && req.body.actions) {
        await Promise.all(req.body.actions.map(async action => {
            if (action.type == "rolechange") {
                if (user.data.role == "owner") {
                    statusres.successful += (await slib.usrf.update(req.body.organization, action.target, action.role)).success ? 1 : 0;
                } else {
                    res.status(401).json({ success: false, error: "Unauthorized" })
                }
            } else if (action.type == "kick") {
                if (user.data.role == "owner") {
                    statusres.successful += (await slib.usrf.delete(req.body.organization, action.target)).success ? 1 : 0;
                } else {
                    res.status(401).json({ success: false, error: "Unauthorized" })
                }
            } else if (action.type == "ownershipchange") {
                if (user.data.role == "owner") {
                    await slib.usrf.update(req.body.organization, action.target, "owner")
                    await slib.usrf.update(req.body.organization, req.user.id, "admin")
                    statusres.successful += 1
                } else {
                    res.status(401).json({ success: false, error: "Unauthorized" })
                }

            }
        }))
        res.status(200).json({ success: statusres.total == statusres.successful, data: {} })
    } else {
        res.status(500).json({ error: 'Something Went Wrong. Try including organization and actions in BODY' })
    }
})



app.post('/api/v1/users/listnames', async (req, res) => {
    if (req.user && req.body.uuids && Array.isArray(req.body.uuids)) {
        let data = await slib.users.listnames(req.body.uuids)
        res.status(200).json({ success: true, data: data })
    } else {
        res.status(500).json({ success: false, error: 'token or uuids array missing' })
    }
})















// ##################  CLAIMS ######################33

app.use('/api/v1/orgs/claims', async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1]
    let user = await slib.auth.getuser(token)
    if (!user.data) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user.data.user;
    next();
});




// Helper function to check permissions
const checkOrgPermission = async (userId, orgId, requiredRoles = ['member']) => {
    const userRole = await slib.usrf.get(userId, orgId)
    if (!userRole.success) return false
    return requiredRoles.includes(userRole.data.role)
}

// Claims endpoints
app.post('/api/v1/orgs/claims/create', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, name, data } = req.body
    if (!orgId || !name) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['member', 'admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    console.log("got to create")
    const result = await slib.claims.create(orgId, {
        name,
        data,
        createdBy: req.user.id
    })

    res.status(200).json(result)
})

app.post('/api/v1/orgs/claims/modify', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, claimId, data } = req.body
    if (!orgId || !claimId || !data) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['member', 'admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.claims.modify(orgId, claimId, data)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/claims/approve', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, claimId } = req.body
    if (!orgId || !claimId) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.claims.approve(orgId, claimId, req.user.id)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/claims/delete', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, claimId } = req.body
    if (!orgId || !claimId) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.claims.delete(orgId, claimId)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/claims/list', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId } = req.body
    if (!orgId) return res.status(400).json({ success: false, error: 'Missing orgId' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['member', 'admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.claims.list(orgId)
    res.status(200).json(result)
})




// ########################## Deposits ####################################


// Deposits endpoints (same pattern as claims)
app.post('/api/v1/orgs/deposits/create', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, name, data } = req.body
    if (!orgId || !name) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['member', 'admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.deposits.create(orgId, {
        name,
        data,
        createdBy: req.user.id
    })

    res.status(200).json(result)
})

app.post('/api/v1/orgs/deposits/modify', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, depositId, data } = req.body
    if (!orgId || !depositId || !data) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['member', 'admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.deposits.modify(orgId, depositId, data)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/deposits/approve', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, depositId } = req.body
    if (!orgId || !depositId) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.deposits.approve(orgId, depositId, req.user.id)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/deposits/delete', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, depositId } = req.body
    if (!orgId || !depositId) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.deposits.delete(orgId, depositId)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/deposits/list', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId } = req.body
    if (!orgId) return res.status(400).json({ success: false, error: 'Missing orgId' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['member', 'admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.deposits.list(orgId)
    res.status(200).json(result)
})



//  ##################### Shopping LIsts ################################

// Shopping lists endpoints (admin/owner only)
app.post('/api/v1/orgs/shoppinglists/create', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, name, items } = req.body
    if (!orgId || !name) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.shoppinglists.create(orgId, {
        name,
        items,
        createdBy: req.user.id
    })

    res.status(200).json(result)
})

app.post('/api/v1/orgs/shoppinglists/modify', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, listId, ...updateData } = req.body
    if (!orgId || !listId) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.shoppinglists.modify(orgId, listId, updateData)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/shoppinglists/delete', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, listId } = req.body
    if (!orgId || !listId) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.shoppinglists.delete(orgId, listId)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/shoppinglists/list', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId } = req.body
    if (!orgId) return res.status(400).json({ success: false, error: 'Missing orgId' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.shoppinglists.list(orgId)
    res.status(200).json(result)
})






app.use('/api/v1/orgs/warehouse', async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1]
    let user = await slib.auth.getuser(token)
    if (!user.data) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user.data.user;
    next();
});

app.post('/api/v1/orgs/warehouse/additem', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, sku } = req.body
    if (!orgId || !sku === undefined) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.warehouse.addItem(orgId, sku)
    res.status(200).json(result)
})

app.post('/api/v1/orgs/warehouse/removeitem', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const { orgId, sku } = req.body
    if (!orgId || !sku) return res.status(400).json({ success: false, error: 'Missing required fields' })

    const hasPermission = await checkOrgPermission(req.user.id, orgId, ['admin', 'owner'])
    if (!hasPermission) return res.status(403).json({ success: false, error: 'Insufficient permissions' })

    const result = await slib.warehouse.removeItem(orgId, sku)
    res.status(200).json(result)
})



// _________________________ API END _________________________
app.listen(3000, () => console.log("🌐 port 3000 running"));

