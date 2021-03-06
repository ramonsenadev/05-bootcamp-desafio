import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostResume {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
  };
}

interface PostProps {
  post: Post;
  previousPost: PostResume | null;
  nextPost: PostResume | null;
  preview: boolean;
}

export default function Post({
  post,
  preview,
  previousPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    if (anchor) {
      script.setAttribute('src', 'https://utteranc.es/client.js');
      script.setAttribute('crossorigin', 'anonymous');
      script.setAttribute('async', 'true');
      script.setAttribute('repo', 'ramonsenadev/comments-test-with-utterances');
      script.setAttribute('issue-term', 'pathname');
      script.setAttribute('label', 'blog');
      script.setAttribute('theme', 'github-dark');
      anchor.appendChild(script);
    }
  }, [post]);

  const timeToRead = post
    ? post.data.content
        .reduce(
          (text, content) => `${text} ${RichText.asText(content.body)}`,
          ''
        )
        .split(' ').length / 200
    : null;

  return (
    <>
      <Header />

      {router.isFallback ? (
        <main className={commonStyles.container}>
          <div className={commonStyles.contentContainer}>Carregando...</div>
        </main>
      ) : (
        <main className={commonStyles.container}>
          <img
            className={styles.banner}
            src={post.data.banner.url}
            alt={post.data.title}
          />
          <div className={commonStyles.contentContainer}>
            <div className={styles.header}>
              <h1 className={styles.title}>{post.data.title}</h1>
              <div className={commonStyles.postDetails}>
                <div className={commonStyles.postDate}>
                  <FiCalendar size="20" />
                  <time>
                    {format(new Date(post.first_publication_date), 'd MMM Y', {
                      locale: ptBR,
                    })}
                  </time>
                </div>
                <div className={commonStyles.postAuthor}>
                  <FiUser size="20" />
                  <span>{post.data.author}</span>
                </div>
                <div className={commonStyles.postTime}>
                  <FiClock size="20" />
                  <span>{`${
                    parseInt(String(timeToRead), 10) < timeToRead
                      ? parseInt(String(timeToRead), 10) + 1
                      : timeToRead.toFixed()
                  } min`}</span>
                </div>
              </div>
              {post.last_publication_date &&
                post.last_publication_date !== post.first_publication_date && (
                  <div className={styles.lastUpdate}>
                    <time>
                      {format(
                        new Date(post.last_publication_date),
                        "'* editado em' d MMM Y, '??s' p",
                        {
                          locale: ptBR,
                        }
                      )}
                    </time>
                  </div>
                )}
            </div>

            <div className={styles.body}>
              {post.data.content.map(content => (
                <div key={content.heading}>
                  {content.heading && <h2>{content.heading}</h2>}
                  {content.body.map(richText => (
                    <p key={richText.text}>{richText.text}</p>
                  ))}
                </div>
              ))}
            </div>
            {(previousPost || nextPost) && (
              <div className={styles.postNavigation}>
                <ul>
                  <li>
                    {previousPost && (
                      <>
                        <p>{previousPost.data.title}</p>
                        <a href={`/post/${previousPost.uid}`}>Post anterior</a>
                      </>
                    )}
                  </li>
                  <li>
                    {nextPost && (
                      <>
                        <p>{nextPost.data.title}</p>
                        <a href={`/post/${nextPost.uid}`}>Pr??ximo post</a>
                      </>
                    )}
                  </li>
                </ul>
              </div>
            )}
            <div className={styles.commentsContainer}>
              <div id="inject-comments-for-uterances" />
            </div>
            {preview && (
              <aside>
                <Link href="/api/exit-preview">
                  <a className={commonStyles.previewModeButton}>
                    Sair do modo Preview
                  </a>
                </Link>
              </aside>
            )}
          </div>
        </main>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = await getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      fetch: 'posts.uid',
      pageSize: 1,
    }
  );

  const paths = posts.results.map(post => ({ params: { slug: post.uid } }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content?.heading,
        body: content.body,
      })),
    },
  };

  const previousPostResponse = await prismic.query(
    [
      Prismic.predicates.dateBefore(
        'document.first_publication_date',
        response.first_publication_date
      ),
    ],
    {
      fetch: ['posts.title'],
      pageSize: 1,
    }
  );

  let previousPost = null;
  if (previousPostResponse.results.length >= 1) {
    previousPost = {
      uid: previousPostResponse.results[0].uid,
      data: {
        title: previousPostResponse.results[0].data.title,
      },
    };
  }

  const nextPostResponse = await prismic.query(
    [
      Prismic.predicates.dateAfter(
        'document.first_publication_date',
        response.first_publication_date
      ),
    ],
    {
      fetch: ['posts.title'],
      pageSize: 1,
    }
  );

  let nextPost = null;
  if (nextPostResponse.results.length >= 1) {
    nextPost = {
      uid: nextPostResponse.results[0].uid,
      data: {
        title: nextPostResponse.results[0].data.title,
      },
    };
  }

  return {
    props: {
      post,
      previousPost,
      nextPost,
      preview,
    },
  };
};
