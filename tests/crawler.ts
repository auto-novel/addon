import { Api } from "@/utils/api";

async function test_crawler(api: Api) {
  {
    console.log("1");
    const ret = await api.http_get(
      "https://www.oldmantvg.net/%e6%8e%8c%e6%9c%ba%e6%b8%b8%e6%88%8f/psv/psv%e4%b8%ad%e6%96%87%e6%b8%b8%e6%88%8f%e5%85%a8%e9%9b%86"
    );
    console.log(await ret);
  }
  console.log("-----------------------------");
  {
    console.log("2");
    const ret = await api.tab_http_get(
      "https://www.oldmantvg.net/%e6%8e%8c%e6%9c%ba%e6%b8%b8%e6%88%8f/psv/psv%e4%b8%ad%e6%96%87%e6%b8%b8%e6%88%8f%e5%85%a8%e9%9b%86"
    );
    console.log(ret);
  }
  {
    console.log("3");
    await api.tab_swith_to("https://beeceptor.com/resources/http-echo/");
    console.log("4");
    const ret = await api.http_post_json("https://echo.free.beeceptor.com", { world: "hello" });
    console.log(await ret);
  }
  {
    console.log("5");
    const ret = await api.tab_http_get("https://echo.free.beeceptor.com");
    console.log(ret);
  }
  {
    console.log("6");
    await api.tab_swith_to("https://echo.free.beeceptor.com");
    console.log("6-1");
    const ret = await api.tab_http_post_json("https://echo.free.beeceptor.com", { hello: "world" });
    console.log(ret);
  }
  {
    console.log("7");
    await api.tab_swith_to("https://beeceptor.com/resources/http-echo/");
    console.log("8");
    const ret = await api.tab_http_post_json("https://echo.free.beeceptor.com", { world: "hello" });
    console.log(ret);
  }
  {
    console.log("9");
    await api.tab_swith_to("https://ncode.syosetu.com/n9669bk/1");
    console.log("10");
    const ret = await api.dom_query_selector_all("article.p-novel");
    console.log(ret);
  }
}
