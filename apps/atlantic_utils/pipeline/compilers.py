from os.path import dirname

from django.contrib.staticfiles.finders import get_finders

from pipeline.conf import settings
from pipeline.compilers.sass import SASSCompiler


class RelativePathSASSCompiler(SASSCompiler):
    def compile_file(self, infile, outfile, outdated=False, force=False):
        static_paths = [settings.STATIC_ROOT, ]
        finders = [f for f in get_finders() if hasattr(f, 'storages')]
        for finder in finders:
            static_paths += [s.location for s in finder.storages.itervalues()]

        compiled_paths = " ".join(['-I "%s"' % path for path in static_paths])

        command = "%s %s %s %s %s" % (
            settings.PIPELINE_SASS_BINARY,
            compiled_paths,
            settings.PIPELINE_SASS_ARGUMENTS,
            infile,
            outfile
        )

        return self.execute_command(command, cwd=dirname(infile))
