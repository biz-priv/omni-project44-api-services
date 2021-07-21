async function createPagination(response, host, path, page, size, elementCount, LastEvaluatedkey, totalCount, prevLink) {
  page = parseInt(page);
  let pageObject = {};
  if(elementCount != 0){
    pageObject['Size'] = elementCount;
  } 
  if(totalCount != 0){
    pageObject['TotalElement'] = totalCount;
  }
  if(parseInt(totalCount / size)){
    pageObject['TotalPages'] = parseInt(totalCount / size);
  }
  if(page != 0){
    pageObject['Number'] = page;
  }
  response["Page"] = pageObject;
  let links = {
    "self": {
      "href": prevLink
    }
  };

  if (LastEvaluatedkey) {
    page += 1;
    links["self"]["nextHref"] = host + path + page + "&size=" + size + LastEvaluatedkey;
    response["_links"] = links;
  }
  response["_links"] = links;
  return response;
}

module.exports = {
  createPagination
};