import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  time_to_read: string;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      };
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  return (
    <main className={commonStyles.container}>
      <div className={commonStyles.contentContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>{post.data.title}</h1>
          <div className={commonStyles.postDetails}>
            <div className={commonStyles.postDate}>
              <FiCalendar size="20" />
              <time>{post.first_publication_date}</time>
            </div>
            <div className={commonStyles.postAuthor}>
              <FiUser size="20" />
              <span>{post.data.author}</span>
            </div>
            <div className={commonStyles.postTime}>
              <FiClock size="20" />
              <span>{post.time_to_read}</span>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {post.data.content.map(content => (
            <div key={content.body.text}>
              {content.heading && <h2>{content.heading}</h2>}
              <div dangerouslySetInnerHTML={{ __html: content.body.html }} />
            </div>
          ))}
        </div>
      </div>
    </main>
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    lang: 'pt-BR',
  });

  const timeToRead =
    response.data.content
      .reduce((text, content) => `${text} ${RichText.asText(content.body)}`, '')
      .split(' ').length / 200;

  const post: Post = {
    first_publication_date: format(
      new Date(response.first_publication_date),
      'd MMM Y',
      {
        locale: ptBR,
      }
    ),
    time_to_read: `${timeToRead.toFixed(0)} min`,
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content?.heading,
        body: {
          html: RichText.asHtml(content.body),
          text: RichText.asText(content.body),
        },
      })),
    },
  };

  return {
    props: {
      post,
    },
  };
};
