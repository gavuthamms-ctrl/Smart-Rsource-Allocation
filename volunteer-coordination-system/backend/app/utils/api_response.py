from flask import jsonify

def success_response(data=None, message='Success', status_code=200):
    return jsonify({
        'success' : True,
        'message' : message,
        'data'    : data
    }), status_code

def error_response(message='An error occurred', status_code=400, errors=None):
    return jsonify({
        'success' : False,
        'message' : message,
        'errors'  : errors
    }), status_code

def paginated_response(items, total, page, pages, per_page):
    return jsonify({
        'success'    : True,
        'data'       : items,
        'pagination' : {
            'total'   : total,
            'page'    : page,
            'pages'   : pages,
            'per_page': per_page
        }
    }), 200
