import ArticlesPagination from "../components/ArticlesPagination";
import ArticlesPreview from "../components/ArticlesPreview";
import { useFeedContext } from "../context/FeedContext";
import useArticleList from "../hooks/useArticles";

function HomeArticles() {
  const { tabName, tagName } = useFeedContext();

  const { articles, articlesCount, loading, setArticlesData } = useArticleList({
    location: tabName,
    tabName,
    tagName,
  });

  if (loading) {
    return (
      <div className="article-preview">
        <em>Loading articles list...</em>
      </div>
    );
  }

  return articles.length > 0 ? (
    <>
      <ArticlesPreview
        articles={articles}
        loading={loading}
        updateArticles={setArticlesData}
      />

      <ArticlesPagination
        articlesCount={articlesCount}
        location={tabName}
        tagName={tagName}
        updateArticles={setArticlesData}
      />
    </>
  ) : (
    <div className="article-preview">Articles not available.</div>
  );
}

export default HomeArticles;
