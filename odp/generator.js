var e = {};

__rand = _i => {
    var i = Math.pow(10, _i - 1);
    var j = Math.pow(10, _i) - 1;
    return ((Math.floor(Math.random() * (j - i + 1)) + i));
};

__generateP = (_role1, _role2, _role3) => {
    let p = {};
    p[_role1] = "R";
    p[_role2] = "R";
    p[_role3] = "R";
    return p;
};

e.generateSampleDataService = (_data, _app) => {
    let role1 = `P${__rand(10)}`;
    let role2 = `P${__rand(10)}`;
    let role3 = `P${__rand(10)}`;
    return {
        "name": _data.name,
        "api": _data.api,
        "app": _app,
        "definition": {
            "_id": {
                "prefix": "DUM",
                "suffix": null,
                "padding": null,
                "counter": JSON.parse(_data.definition)._id.counter,
                "isPermanentDelete": true,
                "properties": {
                    "name": "ID",
                    "dataKey": "_id",
                    "dataPath": "_id"
                }
            },
            "asd": {
                "type": "String",
                "properties": {
                    "name": "asd",
                    "fieldLength": 0,
                    "_typeChanged": "String",
                    "dataKey": "asd",
                    "dataPath": "asd"
                }
            }
        },
        "versionValidity": {
            "validityType": "count",
            "validityValue": -1
        },
        "role": {
            "roles": [{
                    "skipReviewRole": true,
                    "id": role1,
                    "name": "Skip Review asd",
                    "operations": [{
                            "method": "SKIP_REVIEW"
                        },
                        {
                            "method": "POST"
                        },
                        {
                            "method": "PUT"
                        },
                        {
                            "method": "DELETE"
                        },
                        {
                            "method": "GET",
                            "workflowRoles": []
                        }
                    ],
                    "description": "This role entitles an authorized user to create, update or delete a record and without any approval"
                },
                {
                    "manageRole": true,
                    "id": role2,
                    "name": "Manage asd",
                    "operations": [{
                            "method": "POST"
                        },
                        {
                            "method": "PUT"
                        },
                        {
                            "method": "DELETE"
                        },
                        {
                            "method": "GET"
                        }
                    ],
                    "description": "This role entitles an authorized user to create, update or delete a record"
                },
                {
                    "viewRole": true,
                    "id": role3,
                    "name": "View asd",
                    "operations": [{
                        "method": "GET"
                    }],
                    "description": "This role entitles an authorized user to view the record"
                }
            ],
            "fields": {
                "_id": {
                    "_t": "String",
                    "_p": __generateP(role1, role2, role3)
                },
                "asd": {
                    "_t": "String",
                    "_p": __generateP(role1, role2, role3)
                }
            }
        }
    }
}

module.exports = e;